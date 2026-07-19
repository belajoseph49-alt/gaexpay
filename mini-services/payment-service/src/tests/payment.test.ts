/**
 * mini-services/payment-service/src/tests/payment.test.ts
 *
 * Suite de tests pour le microservice de paiement.
 * Teste la machine à états, l'idempotence, la sécurité webhook, la concurrence et la réconciliation.
 */

import { PaymentService, PaymentStatus } from "../services/payment.service";
import { db } from "../lib/db";
import { validateCinetPayWebhook } from "../middlewares/webhook.middleware";
import { createHmac } from "node:crypto";
import Decimal from "decimal.js";

// Mock de Prisma Client
jest.mock("../lib/db", () => {
  return {
    db: {
      paymentTransaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      paymentAuditLog: {
        create: jest.fn(),
      },
      idempotencyRecord: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      webhookEvent: {
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(db)),
    },
  };
});

describe("Payment Service - State Machine & Transitions", () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService();
  });

  it("should allow valid state transitions", async () => {
    const mockTx = {
      id: "tx_123",
      transactionRef: "GAEX-REF",
      status: "INITIATED",
      amount: new Decimal("100"),
    };

    (db.paymentTransaction.findUnique as jest.Mock).mockResolvedValue(mockTx);
    (db.paymentTransaction.update as jest.Mock).mockResolvedValue({
      ...mockTx,
      status: "PENDING",
    });

    const result = await paymentService.transitionTransactionStatus(
      "tx_123",
      "PENDING",
      "SYSTEM"
    );

    expect(result.status).toBe("PENDING");
    expect(db.paymentTransaction.update).toHaveBeenCalled();
    expect(db.paymentAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousStatus: "INITIATED",
          newStatus: "PENDING",
        }),
      })
    );
  });

  it("should forbid invalid state transitions", async () => {
    const mockTx = {
      id: "tx_123",
      transactionRef: "GAEX-REF",
      status: "SUCCESS",
      amount: new Decimal("100"),
    };

    (db.paymentTransaction.findUnique as jest.Mock).mockResolvedValue(mockTx);

    await expect(
      paymentService.transitionTransactionStatus("tx_123", "FAILED", "SYSTEM")
    ).rejects.toThrow("Forbidden state transition from SUCCESS to FAILED");
  });
});

describe("Payment Service - Idempotency", () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService();
  });

  it("should return existing response snapshot if same idempotency key and same payload is used", async () => {
    const mockRecord = {
      key: "idem_key_1",
      requestHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // Empty body hash
      responseSnapshot: JSON.stringify({ mockResponse: "success" }),
    };

    (db.idempotencyRecord.findUnique as jest.Mock).mockResolvedValue(mockRecord);

    const { isNew, response } = await paymentService.acquireIdempotency("idem_key_1", {});

    expect(isNew).toBe(false);
    expect(response.mockResponse).toBe("success");
    expect(db.idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it("should throw a conflict error if key is reused with a different payload", async () => {
    const mockRecord = {
      key: "idem_key_1",
      requestHash: "old_hash_value",
      responseSnapshot: JSON.stringify({ mockResponse: "success" }),
    };

    (db.idempotencyRecord.findUnique as jest.Mock).mockResolvedValue(mockRecord);

    await expect(
      paymentService.acquireIdempotency("idem_key_1", { newField: "changed" })
    ).rejects.toThrow("CONFLICT: Idempotency key reused with different payload");
  });
});

describe("Webhook Validation - Security Middlewares", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CINETPAY_SECRET_KEY = "supersecret";
    process.env.CINETPAY_WEBHOOK_IP_WHITELIST = "127.0.0.1";

    mockReq = {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
      rawBody: Buffer.from(JSON.stringify({ cpm_trans_id: "GAEX-REF-1" })),
      body: JSON.stringify({ cpm_trans_id: "GAEX-REF-1" }),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  it("should reject and log webhook with invalid signature", async () => {
    mockReq.headers["x-token"] = "badsignature";
    (db.paymentTransaction.findUnique as jest.Mock).mockResolvedValue({ id: "tx_12" });

    await validateCinetPayWebhook(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Invalid signature" }));
    expect(db.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signatureValid: false,
        }),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should accept webhook with valid signature", async () => {
    const payload = JSON.stringify({ cpm_trans_id: "GAEX-REF-1" });
    const signature = createHmac("sha256", "supersecret").update(payload).digest("hex");
    
    mockReq.headers["x-token"] = signature;
    mockReq.rawBody = Buffer.from(payload);
    
    (db.paymentTransaction.findUnique as jest.Mock).mockResolvedValue({ id: "tx_12" });

    await validateCinetPayWebhook(mockReq, mockRes, mockNext);

    expect(db.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signatureValid: true,
        }),
      })
    );
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("Payment Service - Concurrency & Double Verification", () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService();
  });

  it("should prevent processing double notifications concurrently using transactional lock checks", async () => {
    const mockTx = {
      id: "tx_123",
      transactionRef: "GAEX-REF-DUPLICATE",
      status: "PENDING",
      amount: new Decimal("250.00"),
      userId: "user_1",
      walletId: "wallet_1",
      currency: "XAF",
      direction: "PAYIN",
    };

    // Premier appel trouve le statut PENDING et le met à jour vers SUCCESS
    // Deuxième appel trouve SUCCESS et s'interrompt sans doubler le crédit
    (db.paymentTransaction.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockTx) // Premier check trouve PENDING
      .mockResolvedValueOnce({ ...mockTx, status: "SUCCESS" }); // Deuxième check trouve SUCCESS

    // Mock l'appel de vérification CinetPay
    const checkPayInStatusSpy = jest
      .spyOn((paymentService as any).cinetpay, "checkPayInStatus")
      .mockResolvedValue({
        status: "SUCCESS",
        rawResponse: { code: "00", data: { status: "ACCEPTED" } },
      });

    // Mock l'appel au wallet-service
    const notifyWalletServiceSpy = jest
      .spyOn(paymentService as any, "notifyWalletService")
      .mockResolvedValue(undefined);

    // Lance la première réconciliation
    await paymentService.reconcileOrProcessWebhook("GAEX-REF-DUPLICATE", {}, "WEBHOOK");

    // Lance la deuxième réconciliation (simulée)
    await paymentService.reconcileOrProcessWebhook("GAEX-REF-DUPLICATE", {}, "WEBHOOK");

    // La mise à jour de la transaction n'est appelée qu'une seule fois
    expect(db.paymentTransaction.update).toHaveBeenCalledTimes(1);
    // Le service wallet n'est notifié qu'une seule fois
    expect(notifyWalletServiceSpy).toHaveBeenCalledTimes(1);
  });
});

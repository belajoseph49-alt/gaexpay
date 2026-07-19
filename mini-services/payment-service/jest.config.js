/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  // Pas de setupFilesAfterEnv car les tests utilisent des mocks Jest (pas de vraie DB)
  moduleNameMapper: {
    // Permet l'import de fichiers TypeScript dans les tests
  },
  globals: {
    "ts-jest": {
      tsconfig: {
        // Les tests sont en CommonJS (ts-jest par défaut)
        esModuleInterop: true,
      },
    },
  },
};

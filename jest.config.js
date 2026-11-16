module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true, strict: true, strictPropertyInitialization: false, skipLibCheck: true } }] },
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  testEnvironment: 'node',
};

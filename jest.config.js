
module.exports = {
    projects: [
      {
        displayName: 'typescript',
        testMatch: ['<rootDir>/**/*.test.ts'],
        testEnvironment: 'node',
        preset: 'ts-jest',
        transform: {
          '^.+\\.ts$': 'ts-jest',
        },
        modulePathIgnorePatterns: ['<rootDir>/cdk.out/'],
      },
      {
        displayName: 'react',
        testMatch: ['<rootDir>/**/client/**/*.test.js'],
        transform: {
          '^.+\\.js$': 'babel-jest',
        },
        globals: {
          'babel-jest': {
            configFile: './babel.config.js',
          },
        },
        modulePathIgnorePatterns: ['<rootDir>/cdk.out/'],
        moduleNameMapper: {
          '\\.(css|scss|sass)$': 'identity-obj-proxy', 
        },
        testEnvironment: 'jsdom',
      },
    ],
  };
  
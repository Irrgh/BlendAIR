module.exports = {
    preset: 'ts-jest',
    testMatch: [
        '**/tests/**/*.ts', // Tests in __tests__ folders
    ],
    moduleNameMapper: {
        '\\.obj$': 'identity-obj-proxy'
    },
};

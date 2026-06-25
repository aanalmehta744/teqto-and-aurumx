module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current'
                }
            }
        ]
    ],
    ignore: [
        'node_modules' // Exclude node_modules from being transpiled
    ]
};

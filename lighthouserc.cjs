module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:5174/#foundations",
        "http://localhost:5174/#forms",
        "http://localhost:5174/#async",
      ],
      startServerCommand: "./node_modules/.bin/bun --port=5174 ./demo/index.html",
      startServerReadyPattern: "url: http://localhost:5174/",
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
        onlyCategories: ["accessibility"],
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["warn", { minScore: 0.95 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-report",
    },
  },
};

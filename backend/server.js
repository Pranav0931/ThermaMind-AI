try {
  require("./dist/server.js");
} catch (error) {
  require("tsx/cjs");
  require("./src/server.ts");
}

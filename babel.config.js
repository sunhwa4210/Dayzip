module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["module-resolver", {
        root: ["./"],
        alias: {
          "@": "./",
          "@/firebase": "./app/firebase" // 루트에 있으면 "./firebase"
        },
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
      }],
      "react-native-reanimated/plugin"
    ]
  };
};

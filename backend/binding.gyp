{
  "targets": [
    {
      "target_name": "codeflow_native",
      "sources": [
        "src/trie.cpp",
        "src/tokenizer.cpp",
        "src/suggestion_engine.cpp",
        "src/binding.cpp"
      ],
      "include_dirs": [
        "include",
        "<!(node -p \"require('path').dirname(require.resolve('node-addon-api'))\")"
      ],
      "cflags": ["-std=c++20", "-O3", "-fexceptions"],
      "cflags_cc": ["-std=c++20", "-O3", "-fexceptions"],
      "conditions": [
        [
          "OS == 'mac'",
          {
            "xcode_settings": {
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "CLANG_CXX_LANGUAGE_DIALECT": "c++20"
            }
          }
        ],
        [
          "OS == 'win'",
          {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "RuntimeLibrary": 2
              }
            }
          }
        ]
      ]
    }
  ]
}

cmake_minimum_required(VERSION 3.12)
project(codeflow_tests)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Threads REQUIRED)

# Prefer system GTest; if not available, download via FetchContent
include(FetchContent)
FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/release-1.14.0.zip
)

FetchContent_MakeAvailable(googletest)

# Include headers from project
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/..)

# Source files
set(SOURCES
        ../backend/src/trie.cpp
        ../backend/src/tokenizer.cpp
)

# Trie tests
add_executable(test_trie test_trie.cpp ${SOURCES})
target_link_libraries(test_trie PRIVATE GTest::gtest_main Threads::Threads)

# Tokenizer tests
add_executable(test_tokenizer test_tokenizer.cpp ${SOURCES})
target_link_libraries(test_tokenizer PRIVATE GTest::gtest_main Threads::Threads)

# Enable testing
include(GoogleTest)
gtest_discover_tests(test_trie)
gtest_discover_tests(test_tokenizer)

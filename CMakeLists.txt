cmake_minimum_required(VERSION 3.12)
project(IntelliCPP)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Threads REQUIRED)

# Include our headers
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/backend/include)

# Backend source files
set(BACKEND_SOURCES
    backend/src/trie.cpp
    backend/src/tokenizer.cpp
    backend/src/suggestion_engine.cpp
    backend/src/code_runner.cpp
)

# Build the test executable
add_executable(test_backend test_backend.cpp ${BACKEND_SOURCES})
target_link_libraries(test_backend PRIVATE Threads::Threads)
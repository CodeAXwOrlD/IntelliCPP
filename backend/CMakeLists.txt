cmake_minimum_required(VERSION 3.12)
project(codeflow_native)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Node.js
execute_process(COMMAND node -p "require('path').dirname(require.resolve('node-addon-api'))"
    OUTPUT_VARIABLE NODE_ADDON_API_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE)

find_package(Threads REQUIRED)

# Add Node addon API include
include_directories(${NODE_ADDON_API_DIR})

# Include our headers
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# Source files
set(SOURCES
    src/trie.cpp
    src/tokenizer.cpp
    src/suggestion_engine.cpp
    src/binding.cpp
)

# Native module
add_library(codeflow_native SHARED ${SOURCES})

# Link against required libraries
target_link_libraries(codeflow_native PRIVATE Threads::Threads)

# Set output directory
set_target_properties(codeflow_native PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/../dist"
)

# Platform-specific settings
if(APPLE)
    set_target_properties(codeflow_native PROPERTIES
        LINK_FLAGS "-undefined dynamic_lookup"
    )
elseif(WIN32)
    set_target_properties(codeflow_native PROPERTIES
        SUFFIX ".node"
    )
endif()

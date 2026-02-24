#include <node.h>
#include <napi.h>
#include <string>
#include <vector>
#include "suggestion_engine.h"

#define NAPI_CPP_EXCEPTIONS

using namespace Napi;

class SuggestionEngineWrapper : public ObjectWrap<SuggestionEngineWrapper> {
private:
    codeflow::SuggestionEngine engine;
    
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        std::vector<ClassPropertyDescriptor<SuggestionEngineWrapper>> methods = {
            InstanceMethod("getSuggestions", &SuggestionEngineWrapper::GetSuggestions),
            InstanceMethod("loadKeywords", &SuggestionEngineWrapper::LoadKeywords),
            InstanceMethod("loadSTLData", &SuggestionEngineWrapper::LoadSTLData),
            InstanceMethod("updateSymbols", &SuggestionEngineWrapper::UpdateSymbols),
            InstanceMethod("getSymbolCount", &SuggestionEngineWrapper::GetSymbolCount),
            InstanceMethod("getIncludedLibraries", &SuggestionEngineWrapper::GetIncludedLibraries),
            InstanceMethod("getSymbolTable", &SuggestionEngineWrapper::GetSymbolTable),
            InstanceMethod("isHeaderIncluded", &SuggestionEngineWrapper::IsHeaderIncluded),
        };
        
        Napi::Function constructor = DefineClass(env, "SuggestionEngine", methods);
        exports.Set("SuggestionEngine", constructor);
        return exports;
    }
    
    SuggestionEngineWrapper(const Napi::CallbackInfo& info)
        : ObjectWrap(info) {}
    
private:
    Napi::Value GetSuggestions(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 2) {
            Napi::TypeError::New(env, "Expected at least 2 arguments").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string prefix = info[0].As<Napi::String>();
        std::string contextType = info[1].As<Napi::String>();
        std::string code = info.Length() > 2 ? info[2].As<Napi::String>().Utf8Value() : "";
        int cursorPosition = info.Length() > 3 ? info[3].As<Napi::Number>().Int32Value() : 0;
        int maxResults = info.Length() > 4 ? info[4].As<Napi::Number>().Int32Value() : 10;
        
        auto suggestions = engine.getSuggestions(prefix, contextType, code, cursorPosition, maxResults);
        
        Napi::Array result = Napi::Array::New(env);
        for (size_t i = 0; i < suggestions.size(); ++i) {
            Napi::Object suggestion = Napi::Object::New(env);
            suggestion.Set("text", suggestions[i].text);
            suggestion.Set("type", suggestions[i].type);
            suggestion.Set("score", suggestions[i].score);
            result[i] = suggestion;
        }
        
        return result;
    }
    
    Napi::Value LoadKeywords(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Expected 1 argument").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string path = info[0].As<Napi::String>();
        engine.loadKeywords(path);
        
        return env.Undefined();
    }

    Napi::Value LoadSTLData(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Expected 1 argument").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string path = info[0].As<Napi::String>();
        engine.loadSTLData(path);
        
        return env.Undefined();
    }
    
    Napi::Value UpdateSymbols(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Expected 1 argument").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string code = info[0].As<Napi::String>();
        engine.updateSymbols(code);
        
        return env.Undefined();
    }
    
    Napi::Value GetSymbolCount(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, engine.getSymbolCount());
    }

    Napi::Value GetIncludedLibraries(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        auto libs = engine.getIncludedLibraries();
        
        Napi::Array result = Napi::Array::New(env);
        for (size_t i = 0; i < libs.size(); ++i) {
            result[i] = Napi::String::New(env, libs[i]);
        }
        
        return result;
    }

    Napi::Value GetSymbolTable(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        auto symbolTable = engine.getSymbolTable();
        
        Napi::Object result = Napi::Object::New(env);
        for (const auto& pair : symbolTable) {
            result.Set(pair.first, pair.second);
        }
        
        return result;
    }

    Napi::Value IsHeaderIncluded(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Expected 1 argument").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        std::string type = info[0].As<Napi::String>();
        bool included = engine.isHeaderIncluded(type);
        
        return Napi::Boolean::New(env, included);
    }
};

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return SuggestionEngineWrapper::Init(env, exports);
}

NODE_API_MODULE(codeflow_native, InitAll)

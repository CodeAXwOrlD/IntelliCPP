#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    cout << "⚡ Initializing IntelliCPP Engine v2.0..." << endl;
    
    // Type 'v.' to trigger fast Trie autocomplete for vector methods
    vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};
    sort(v.begin(), v.end());
    
    cout << "Sorted elements: ";
    for (int n : v) {
        cout << n << " ";
    }
    cout << endl;
    
    return 0;
}
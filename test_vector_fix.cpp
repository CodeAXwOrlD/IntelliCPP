#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    
    // Test the correct way to add elements and access them
    v.push_back(10);  // Index 0
    v.push_back(20);  // Index 1
    
    cout << "Vector size: " << v.size() << endl;
    cout << "v[0] = " << v[0] << endl;  // Should print 10
    cout << "v[1] = " << v[1] << endl;  // Should print 20
    
    // Test with different access methods
    cout << "v.at(0) = " << v.at(0) << endl;  // Safe access
    cout << "v.at(1) = " << v.at(1) << endl;  // Safe access
    
    // Test bounds checking
    try {
        cout << "v.at(2) = " << v.at(2) << endl;  // This will throw exception
    } catch (const out_of_range& e) {
        cout << "Error: " << e.what() << endl;
    }
    
    return 0;
}
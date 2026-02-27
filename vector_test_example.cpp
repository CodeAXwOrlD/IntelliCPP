#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    
    // Correct way to add elements and access them
    v.push_back(10);  // Adds 10 at index 0
    v.push_back(20);  // Adds 20 at index 1
    
    cout << "Vector size: " << v.size() << endl;
    cout << "First element (v[0]): " << v[0] << endl;   // Prints 10
    cout << "Second element (v[1]): " << v[1] << endl;  // Prints 20
    
    // Alternative access methods
    cout << "Using at(): v.at(0) = " << v.at(0) << endl;  // Prints 10
    cout << "Using at(): v.at(1) = " << v.at(1) << endl;  // Prints 20
    
    // Demonstrate bounds checking
    try {
        cout << "Trying to access v[2]: ";
        cout << v.at(2) << endl;  // This will throw an exception
    } catch (const out_of_range& e) {
        cout << "Exception caught: " << e.what() << endl;
    }
    
    return 0;
}
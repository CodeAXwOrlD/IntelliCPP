#include <iostream>
#include <vector>
// Missing #include <stack> - this will show encoding issues
using namespace std;

int main() {
    stack<int> st;  // This will cause "stack" encoding error
    st.push(10);
    cout << st.top() << endl;
    return 0;
}
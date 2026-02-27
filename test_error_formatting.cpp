#include <iostream>
#include <vector>
// Missing #include <stack> - this will cause an error
using namespace std;

int main() {
    stack<int> st;  // This will cause "stack was not declared" error
    st.push(10);
    cout << st.top() << endl;
    return 0;
}
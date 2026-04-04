export const codeTemplates = {
  'Hello World': `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,

  'Vector Example': `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> numbers = {1, 2, 3, 4, 5};

    // Add elements
    numbers.push_back(6);

    // Iterate and print
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;

    return 0;
}`,

  'Class Example': `#include <iostream>
#include <string>
using namespace std;

class Person {
private:
    string name;
    int age;

public:
    Person(string n, int a) : name(n), age(a) {}

    void display() {
        cout << "Name: " << name << ", Age: " << age << endl;
    }

    void setAge(int a) {
        age = a;
    }
};

int main() {
    Person person("Alice", 25);
    person.display();

    person.setAge(26);
    person.display();

    return 0;
}`,

  'File I/O': `#include <iostream>
#include <fstream>
#include <string>
using namespace std;

int main() {
    // Writing to file
    ofstream outputFile("example.txt");
    if (outputFile.is_open()) {
        outputFile << "Hello, File!" << endl;
        outputFile << "This is a test." << endl;
        outputFile.close();
        cout << "Data written to file successfully." << endl;
    } else {
        cout << "Error opening file for writing." << endl;
    }

    // Reading from file
    ifstream inputFile("example.txt");
    if (inputFile.is_open()) {
        string line;
        cout << "Reading from file:" << endl;
        while (getline(inputFile, line)) {
            cout << line << endl;
        }
        inputFile.close();
    } else {
        cout << "Error opening file for reading." << endl;
    }

    return 0;
}`,

  'STL Algorithms': `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> numbers = {5, 2, 8, 1, 9, 3};

    cout << "Original: ";
    for (int num : numbers) cout << num << " ";
    cout << endl;

    // Sort
    sort(numbers.begin(), numbers.end());
    cout << "Sorted: ";
    for (int num : numbers) cout << num << " ";
    cout << endl;

    // Find
    auto it = find(numbers.begin(), numbers.end(), 8);
    if (it != numbers.end()) {
        cout << "Found 8 at position: " << (it - numbers.begin()) << endl;
    }

    // Count
    int count = std::count(numbers.begin(), numbers.end(), 3);
    cout << "Count of 3: " << count << endl;

    return 0;
}`,

  'Smart Pointers': `#include <iostream>
#include <memory>
using namespace std;

class Resource {
public:
    Resource() { cout << "Resource acquired" << endl; }
    ~Resource() { cout << "Resource released" << endl; }
    void doSomething() { cout << "Doing something with resource" << endl; }
};

int main() {
    {
        // Using unique_ptr
        unique_ptr<Resource> res1 = make_unique<Resource>();
        res1->doSomething();

        // Using shared_ptr
        shared_ptr<Resource> res2 = make_shared<Resource>();
        shared_ptr<Resource> res3 = res2; // Shared ownership
        cout << "Shared pointer use count: " << res2.use_count() << endl;

        res2->doSomething();
    } // Resources automatically released here

    cout << "Program finished" << endl;
    return 0;
}`
};
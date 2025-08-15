# 🚏 Dehradun Tempo Management System

> A full-stack route optimization and management application designed to simplify public transit in Dehradun.

This project addresses the complexity of manual travel planning by providing a dynamic, data-driven solution for commuters. It leverages advanced graph algorithms to compute the most efficient travel paths, estimated fares, and distances, offering users a seamless experience through a responsive UI and real-time mapping.

---

## ✨ Key Features

- **Advanced Pathfinding**: Implements and benchmarks multiple core graph algorithms, including **Dijkstra's**, **A***, Breadth-First Search (**BFS**), and Depth-First Search (**DFS**), to identify optimal travel routes based on user-defined source and destination.
- **Performance Optimization**: Achieves sub-second route calculations, significantly improving travel planning efficiency by **over 70%** compared to traditional manual methods.
- **Dynamic Route Visualization**: Provides a live, visual representation of the calculated optimal path on a map, making it easy to follow your journey.
- **Comprehensive Trip Details**: Computes and displays critical trip information, including total fare and distance in kilometers, based on the user's selected route.
- **Flexible Data Management**: Utilizes an **Excel (.xlsx)** file as a backend database, allowing for easy updates and scalability of route, fare, and location data without requiring a complex database setup.
- **Intuitive User Interface**: Features a clean, responsive, and user-friendly design, making it simple for anyone to enter their travel details and receive instant results.

---

## 💻 Technologies Used

| Category | Technologies |
| :--- | :--- |
| **Backend** | `Node.js` |
| **Frontend** | `HTML` `CSS` `JavaScript` |
| **Database** | `Excel (.xlsx)` |
| **Algorithms** | `Dijkstra's Algorithm` `A* Search` `BFS` `DFS` |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your system:

- `Node.js` (LTS version recommended)
- `npm` (Node Package Manager)

### Installation

1. Clone the repository:
    ```bash
    git clone [https://github.com/your-username/dehradun-tempo-project.git](https://github.com/your-username/dehradun-tempo-project.git)
    ```
2. Navigate to the project directory:
    ```bash
    cd dehradun-tempo-project
    ```
3. Install the required Node.js packages:
    ```bash
    npm install
    ```

### Running the Application

1. Start the Node.js backend server:
    ```bash
    node server.js
    ```
2. Open your web browser and navigate to `http://localhost:3000` to access the application.

---

## 🤝 Contribution

Contributions are what make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📜 License

This project is licensed under the **MIT License**. See the `LICENSE` file for more details.

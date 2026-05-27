const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

let students = [
    {
        id: 1,
        name: "Ivan",
        group: "IP-21"
    },
    {
        id: 2,
        name: "Maria",
        group: "IP-22"
    }
];

app.get("/", (req, res) => {
    res.send("Hello from Node.js server");
});

app.get("/students", (req, res) => {
    res.json(students);
});

app.post("/students", (req, res) => {
    const student = {
        id: students.length + 1,
        name: req.body.name,
        group: req.body.group
    };

    students.push(student);

    res.status(201).json({
        message: "Student added",
        student: student
    });
});

app.put("/students/:id", (req, res) => {
    const id = Number(req.params.id);

    const student = students.find(s => s.id === id);

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    student.name = req.body.name || student.name;
    student.group = req.body.group || student.group;

    res.json({
        message: "Student updated",
        student: student
    });
});

app.delete("/students/:id", (req, res) => {
    const id = Number(req.params.id);

    students = students.filter(s => s.id !== id);

    res.json({
        message: "Student deleted"
    });
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
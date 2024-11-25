import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function MainPage() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem("projects")) || [];
    setProjects(savedProjects);
  }, []);

  const createProject = () => {
    const projectName = prompt("Enter project name:");
    if (projectName) {
      const newProject = { id: Date.now(), name: projectName };
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      localStorage.setItem("projects", JSON.stringify(updatedProjects));
    }
  };

  const deleteProject = (id) => {
    const updatedProjects = projects.filter((project) => project.id !== id);
    setProjects(updatedProjects);
    localStorage.setItem("projects", JSON.stringify(updatedProjects));
  };

  const openProject = (id) => {
    navigate(`/project/${id}`);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Project Manager</h1>
      <button onClick={createProject}>Create New Project</button>
      <h2>Projects</h2>
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            {project.name}{" "}
            <button onClick={() => openProject(project.id)}>Open</button>{" "}
            <button onClick={() => deleteProject(project.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MainPage;

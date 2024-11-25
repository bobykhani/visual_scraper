import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css"; // Include updated styles

function MainPage() {
  const [projects, setProjects] = useState([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem("projects")) || [];
    setProjects(savedProjects);
  }, []);

  const createProject = () => {
    if (!newProjectName.trim()) {
      alert("Project name cannot be empty!");
      return;
    }
    const newProject = { id: Date.now(), name: newProjectName.trim() };
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem("projects", JSON.stringify(updatedProjects));
    setNewProjectName(""); // Reset input
    setIsAddingProject(false); // Hide the form
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
    <div className="main-page-container">
      <div className="main-page">
        {/* Header Section */}
        <div className="header">
          <h1>Project Manager</h1>
          {!isAddingProject ? (
            <button
              className="primary-btn"
              onClick={() => setIsAddingProject(true)}
            >
              Create New Project
            </button>
          ) : (
            <div className="add-project-form">
              <input
                type="text"
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="project-input"
              />
              <button className="save-btn" onClick={createProject}>
                Save
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setNewProjectName("");
                  setIsAddingProject(false);
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
  
        {/* Projects List Section */}
        <div className="projects-container">
          <h2>Projects</h2>
          {projects.length > 0 ? (
            <ul className="project-list">
              {projects.map((project) => (
                <li key={project.id} className="project-item">
                  <span className="project-name">{project.name}</span>
                  <div className="project-actions">
                    <button
                      className="open-btn"
                      onClick={() => openProject(project.id)}
                    >
                      Open
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => deleteProject(project.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-projects-text">
              No projects yet. Click <strong>"Create New Project"</strong> to add
              one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
  
}

export default MainPage;

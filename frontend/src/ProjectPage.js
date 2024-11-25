import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import OriginalApp from "./OriginalApp"; // Import your current app component

function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);

  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem("projects")) || [];
    const currentProject = savedProjects.find((p) => p.id === Number(projectId));
    if (!currentProject) {
      alert("Project not found!");
      navigate("/");
    } else {
      setProject(currentProject);
    }
  }, [projectId, navigate]);

  return (
    <div>
      {project ? (
        <>
          <header style={{ padding: "10px", backgroundColor: "#f4f4f4" }}>
            <button onClick={() => navigate("/")}>Back to Projects</button>
            <h1>{project.name}</h1>
          </header>
          <OriginalApp projectName={project.name} projectId={projectId} />
        </>
      ) : (
        <p>Loading project...</p>
      )}
    </div>
  );
  
}

export default ProjectPage;

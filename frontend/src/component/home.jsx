import { useState } from "react";
import axios from "axios";
import { BrowserRouter, Route, Router, Link } from "react-router-dom";

 

function Home() {
  return (
    <div>
      <h2>Home Component</h2>
      <h1>Welcome to our school </h1>
      <h2>Enrollment</h2>
      
    </div>
  );
}
import { useEffect } from "react";

export default Home;
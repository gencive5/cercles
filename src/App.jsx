import './App.css';
import CircleGrid from './CircleGrid';
import Contact from './Contact';


const resizeOps = () => {
    document.documentElement.style.setProperty("--vh", window.innerHeight * 0.01 + "px");
  };

  resizeOps();
  window.addEventListener("resize", resizeOps);



function App() {
  return (
    
      <div>
        <CircleGrid />
        <br />
        <Contact />
      </div>
   
  );
}

export default App;
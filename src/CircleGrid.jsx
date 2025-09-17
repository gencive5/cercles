import React, { useEffect, useState, useRef } from 'react';
import './CircleGrid.css';

const CircleGrid = ({
  minCircleSize = 20,
  maxCircleSize = 40,
  gapRatio = 0.2,
  circleStyle = {},
  customCircles = {},
}) => {
  const gridRef = useRef(null);
  const [circleSize, setCircleSize] = useState(maxCircleSize);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);
  const [activeCircle, setActiveCircle] = useState(null);

  useEffect(() => {
    const calculateLayout = () => {
      if (!gridRef.current) return;
      
      const containerWidth = gridRef.current.clientWidth;
      const containerHeight = gridRef.current.clientHeight;
      
      // Calculate maximum possible circle size that fits both width and height
      const widthBasedSize = containerWidth / Math.floor(containerWidth / (maxCircleSize * (1 + gapRatio)));
      const heightBasedSize = containerHeight / Math.floor(containerHeight / (maxCircleSize * (1 + gapRatio)));
      
      const newCircleSize = Math.max(
        minCircleSize,
        Math.min(maxCircleSize, widthBasedSize, heightBasedSize)
      );
      
      setCircleSize(newCircleSize);
      
      // Calculate columns and rows based on available space
      const gapSize = newCircleSize * gapRatio;
      const calculatedCols = Math.floor(containerWidth / (newCircleSize + gapSize));
      const calculatedRows = Math.floor(containerHeight / (newCircleSize + gapSize));
      
      setCols(calculatedCols);
      setRows(calculatedRows);
    };

    calculateLayout();
    const resizeObserver = new ResizeObserver(calculateLayout);
    if (gridRef.current) resizeObserver.observe(gridRef.current);

    return () => resizeObserver.disconnect();
  }, [minCircleSize, maxCircleSize, gapRatio]);

  // Handle touch events
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.classList.contains('circle')) {
      setActiveCircle(element.id);
      element.classList.add('active');
    }
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Remove active class from previously active circle
    if (activeCircle) {
      const prevElement = document.getElementById(activeCircle);
      if (prevElement && prevElement !== element) {
        prevElement.classList.remove('active');
      }
    }
    
    // Add active class to new element if it's a circle
    if (element && element.classList.contains('circle')) {
      setActiveCircle(element.id);
      element.classList.add('active');
    } else {
      setActiveCircle(null);
    }
  };

  const handleTouchEnd = () => {
    if (activeCircle) {
      const element = document.getElementById(activeCircle);
      if (element) {
        element.classList.remove('active');
      }
      setActiveCircle(null);
    }
  };


  const gapSize = circleSize * gapRatio;

  return (
    <div 
      ref={gridRef}
      className="circle-grid-container"
      style={{
        '--circle-size': `${circleSize}px`,
        '--gap-size': `${gapSize}px`,
        '--rows': rows,
        '--cols': cols,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="circle-grid">
        {Array.from({ length: rows * cols }).map((_, index) => {
          const id = `c${index + 1}`;
          return (
            <div
              key={id}
              id={id}
              className="circle"
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
                ...circleStyle,
                ...(customCircles[id] || {})
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CircleGrid;
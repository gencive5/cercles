import React, { useEffect, useState, useRef } from 'react';
import './CircleGrid.css';

const CircleGrid = ({
  minCircleSize = 40,
  maxCircleSize = 50,
  mobileMinCircleSize = 25,
  mobileMaxCircleSize = 30,
  gapRatio = 0.2,
  circleStyle = {},
  customCircles = {}, // e.g. { c3: { style: {...}, linger: 600 } }
  lingerMs = 1400,     // default linger time (ms)
  modalContent = "Inspired from Betelgeuse from the portfolio Cinétique III, 1959 - Victor Vasarely", // Content for the modal
}) => {
  const gridRef = useRef(null);
  const [circleSize, setCircleSize] = useState(maxCircleSize);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showModal, setShowModal] = useState(false);
  const [lastCircleId, setLastCircleId] = useState('');
  const [modalLetters, setModalLetters] = useState([]);

  // Active ids stored as a Set so multiple circles can linger at once.
  const [activeIds, setActiveIds] = useState(() => new Set());
  const activeIdsRef = useRef(activeIds);
  useEffect(() => { activeIdsRef.current = activeIds; }, [activeIds]);

  // track the currently touched circle id (the one under the finger right now)
  const currentRef = useRef(null);

  // scheduled removal timeouts, map id -> timeoutId
  const scheduledRef = useRef({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const calculateLayout = () => {
      if (!gridRef.current) return;

      const containerWidth = gridRef.current.clientWidth;
      const containerHeight = gridRef.current.clientHeight;

      const effectiveMin = isMobile ? mobileMinCircleSize : minCircleSize;
      const effectiveMax = isMobile ? mobileMaxCircleSize : maxCircleSize;

      // defensively avoid division by zero: floor at least 1
      const widthSlots = Math.max(1, Math.floor(containerWidth / (effectiveMax * (1 + gapRatio))));
      const heightSlots = Math.max(1, Math.floor(containerHeight / (effectiveMax * (1 + gapRatio))));

      const widthBasedSize = containerWidth / widthSlots;
      const heightBasedSize = containerHeight / heightSlots;

      const newCircleSize = Math.max(effectiveMin, Math.min(effectiveMax, widthBasedSize, heightBasedSize));
      setCircleSize(newCircleSize);

      const gapSize = newCircleSize * gapRatio;
      const calculatedCols = Math.max(0, Math.floor(containerWidth / (newCircleSize + gapSize)));
      const calculatedRows = Math.max(0, Math.floor(containerHeight / (newCircleSize + gapSize)));

      setCols(calculatedCols);
      setRows(calculatedRows);
      
      // Calculate the last circle ID
      const lastId = `c${calculatedCols * calculatedRows}`;
      setLastCircleId(lastId);
    };

    calculateLayout();
    const ro = new ResizeObserver(calculateLayout);
    if (gridRef.current) ro.observe(gridRef.current);

    return () => {
      ro.disconnect();
    };
  }, [minCircleSize, maxCircleSize, mobileMinCircleSize, mobileMaxCircleSize, gapRatio, isMobile]);

  // Prepare letters for modal text when modal opens
  useEffect(() => {
    if (showModal) {
      // Split into characters (including spaces)
      const letters = modalContent.split('').map((char, index) => ({
        char: char,
        id: index
      }));
      setModalLetters(letters);
    }
  }, [showModal, modalContent]);

  // --- helpers for active state & scheduling ---
  const addActive = (id) => {
    setActiveIds(prev => {
      const s = new Set(prev);
      s.add(id);
      return s;
    });
  };

  const removeActiveImmediate = (id) => {
    setActiveIds(prev => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  };

  const clearScheduled = (id) => {
    const t = scheduledRef.current[id];
    if (t) {
      clearTimeout(t);
      delete scheduledRef.current[id];
    }
  };

  const scheduleRemove = (id, delay) => {
    clearScheduled(id);
    scheduledRef.current[id] = setTimeout(() => {
      removeActiveImmediate(id);
      delete scheduledRef.current[id];
    }, delay);
  };

  const getLinger = (id) => {
    const cfg = customCircles?.[id];
    if (cfg && typeof cfg.linger === 'number') return cfg.linger;
    return lingerMs;
  };

  // Handle click on the last circle
  const handleLastCircleClick = () => {
    setShowModal(true);
  };

  // --- touch handlers ---
  const handleTouchStart = (e) => {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.classList.contains('circle')) {
      const id = el.id;
      
      // If it's the last circle, don't activate the normal touch behavior
      if (id === lastCircleId) return;
      
      clearScheduled(id);
      addActive(id);
      currentRef.current = id;
    }
  };

  const handleTouchMove = (e) => {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);

    if (el && el.classList.contains('circle')) {
      const id = el.id;
      
      // If it's the last circle, don't activate the normal touch behavior
      if (id === lastCircleId) return;
      
      const prev = currentRef.current;
      if (prev && prev !== id) {
        // schedule previous to linger (don't remove immediately)
        scheduleRemove(prev, getLinger(prev));
      }
      clearScheduled(id); // cancel removal if it was scheduled
      addActive(id);
      currentRef.current = id;
    } else {
      // not over any circle: schedule removal of current (so it lingers)
      const prev = currentRef.current;
      if (prev) {
        scheduleRemove(prev, getLinger(prev));
        currentRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.id === lastCircleId) {
      handleLastCircleClick();
      return;
    }
    
    const current = currentRef.current;
    if (current) {
      scheduleRemove(current, getLinger(current));
      currentRef.current = null;
    }
  };

  // Handle click (for desktop)
  const handleClick = (e) => {
    if (e.target.id === lastCircleId) {
      handleLastCircleClick();
    }
  };

  // cleanup scheduled timers on unmount
  useEffect(() => {
    return () => {
      Object.values(scheduledRef.current).forEach(clearTimeout);
      scheduledRef.current = {};
    };
  }, []);

  const gapSize = circleSize * gapRatio;

  return (
    <>
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
        onClick={handleClick}
      >
        <div className="circle-grid">
          {Array.from({ length: rows * cols }).map((_, index) => {
            const id = `c${index + 1}`;
            const custom = customCircles[id] || {};
            const customStyle = custom.style || {};
            const isLastCircle = id === lastCircleId;
            
            return (
              <div
                key={id}
                id={id}
                className={`circle ${activeIds.has(id) ? 'active' : ''} ${isLastCircle ? 'last-circle' : ''}`}
                style={{
                  width: `${circleSize}px`,
                  height: `${circleSize}px`,
                  ...circleStyle,
                  ...customStyle,
                  cursor: isLastCircle ? 'pointer' : 'default',
                }}
              >
                {showModal && modalLetters[index] && (
                  <span className="circle-letter">
                    {modalLetters[index].char}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Modal - now just a simple overlay */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
        </div>
      )}
    </>
  );
};

export default CircleGrid;
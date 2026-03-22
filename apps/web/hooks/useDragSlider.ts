import { useRef, useState, useCallback } from 'react';

export function useDragSlider() {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [lastX, setLastX] = useState(0);
  const [animationFrame, setAnimationFrame] = useState<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const dragStartedRef = useRef(false);
  const DRAG_THRESHOLD_PX = 6;

  const applyMomentum = useCallback(() => {
    const slider = sliderRef.current;
    if (!slider || Math.abs(velocity) < 0.5) {
      setVelocity(0);
      return;
    }

    const newVelocity = velocity * 0.95; // Friction
    slider.scrollLeft += newVelocity;
    setVelocity(newVelocity);

    if (Math.abs(newVelocity) > 0.5) {
      const frame = requestAnimationFrame(applyMomentum);
      setAnimationFrame(frame);
    }
  }, [velocity]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider) return;
    
    // Cancel any ongoing momentum animation
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      setAnimationFrame(null);
    }
    
    setIsPointerDown(true);
    setIsDragging(false);
    dragStartedRef.current = false;
    const x = e.pageX - slider.offsetLeft;
    setStartX(x);
    setLastX(x);
    setScrollLeft(slider.scrollLeft);
    setVelocity(0);
    lastTimeRef.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointerDown) return;

    const slider = sliderRef.current;
    if (!slider) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTimeRef.current;
    const x = e.pageX - slider.offsetLeft;

    if (!dragStartedRef.current) {
      if (Math.abs(x - startX) < DRAG_THRESHOLD_PX) {
        return;
      }

      dragStartedRef.current = true;
      setIsDragging(true);
      slider.style.cursor = 'grabbing';
      slider.style.scrollBehavior = 'auto';
      slider.style.scrollSnapType = 'none';
      slider.classList.add('dragging');
    }

    e.preventDefault();
    
    // Calculate velocity for momentum
    if (deltaTime > 0) {
      const newVelocity = (x - lastX) / deltaTime * 10; // Scale for smoother feel
      setVelocity(newVelocity);
    }
    
    const walk = (x - startX) * 1.2; // Reduced multiplier for more control
    slider.scrollLeft = scrollLeft - walk;
    
    setLastX(x);
    lastTimeRef.current = currentTime;
  };

  const handleMouseUp = () => {
    if (!isPointerDown) return;

    setIsPointerDown(false);
    const slider = sliderRef.current;
    if (slider) {
      slider.style.cursor = 'grab';
      slider.style.scrollBehavior = 'smooth';
      slider.style.scrollSnapType = 'x mandatory';
      slider.classList.remove('dragging');
      dragStartedRef.current = false;
      
      // Apply momentum if velocity is significant
      if (isDragging && Math.abs(velocity) > 2) {
        const frame = requestAnimationFrame(applyMomentum);
        setAnimationFrame(frame);
      }
    }

    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    if (!isPointerDown) return;

    setIsPointerDown(false);
    const slider = sliderRef.current;
    if (slider) {
      slider.style.cursor = 'grab';
      slider.style.scrollBehavior = 'smooth';
      slider.style.scrollSnapType = 'x mandatory';
      slider.classList.remove('dragging');
      dragStartedRef.current = false;
      
      // Apply momentum if velocity is significant
      if (isDragging && Math.abs(velocity) > 2) {
        const frame = requestAnimationFrame(applyMomentum);
        setAnimationFrame(frame);
      }
    }

    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    if (!slider || !e.touches || e.touches.length === 0) return;
    
    // Cancel any ongoing momentum animation
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      setAnimationFrame(null);
    }
    
    setIsPointerDown(true);
    setIsDragging(false);
    dragStartedRef.current = false;
    const touch = e.touches[0]!;
    const x = touch.pageX - slider.offsetLeft;
    setStartX(x);
    setLastX(x);
    setScrollLeft(slider.scrollLeft);
    setVelocity(0);
    lastTimeRef.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPointerDown) return;
    
    const slider = sliderRef.current;
    if (!slider || !e.touches || e.touches.length === 0) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTimeRef.current;
    const touch = e.touches[0]!;
    const x = touch.pageX - slider.offsetLeft;

    if (!dragStartedRef.current) {
      if (Math.abs(x - startX) < DRAG_THRESHOLD_PX) {
        return;
      }

      dragStartedRef.current = true;
      setIsDragging(true);
      slider.style.scrollBehavior = 'auto';
      slider.style.scrollSnapType = 'none';
      slider.classList.add('dragging');
    }

    e.preventDefault();
    
    // Calculate velocity for momentum
    if (deltaTime > 0) {
      const newVelocity = (x - lastX) / deltaTime * 10; // Scale for smoother feel
      setVelocity(newVelocity);
    }
    
    const walk = (x - startX) * 1.2; // Reduced multiplier for more control
    slider.scrollLeft = scrollLeft - walk;
    
    setLastX(x);
    lastTimeRef.current = currentTime;
  };

  const handleTouchEnd = () => {
    if (!isPointerDown) return;

    setIsPointerDown(false);
    const slider = sliderRef.current;
    if (slider) {
      slider.style.scrollBehavior = 'smooth';
      slider.style.scrollSnapType = 'x mandatory';
      slider.classList.remove('dragging');
      dragStartedRef.current = false;
      
      // Apply momentum if velocity is significant
      if (isDragging && Math.abs(velocity) > 2) {
        const frame = requestAnimationFrame(applyMomentum);
        setAnimationFrame(frame);
      }
    }

    setIsDragging(false);
  };

  const dragHandlers = {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    sliderRef,
    isDragging,
    dragHandlers,
  };
}

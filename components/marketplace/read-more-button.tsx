"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface ReadMoreButtonProps {
  tabValue: string;
  className?: string;
}

export function ReadMoreButton({ tabValue, className }: ReadMoreButtonProps) {
  const handleClick = () => {
    const trigger = document.querySelector(`[value="${tabValue}"]`) as HTMLElement;
    if (trigger) {
      trigger.click();
      trigger.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Button 
      variant="link" 
      className={className} 
      onClick={handleClick}
    >
      Read Full Description →
    </Button>
  );
}

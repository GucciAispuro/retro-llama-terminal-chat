
import { useEffect, useState } from "react";

type AvatarState = "idle" | "thinking" | "talking";

// ASCII art avatars for different states
const avatars = {
  idle: [
    `  .-""-.  `,
    ` /      \\ `,
    `|  o  o  |`,
    `|   --   |`,
    ` \\ .--. / `,
    `  '----'  `
  ],
  thinking: [
    `  .-""-.  `,
    ` /      \\ `,
    `|  ^  ^  |`,
    `|   --   |`,
    ` \\ .**. / `,
    `  '----'  `
  ],
  talking: [
    `  .-""-.  `,
    ` /      \\ `,
    `|  o  o  |`,
    `|   OO   |`,
    ` \\ .--. / `,
    `  '----'  `
  ]
};

// Convert array of strings to a single string with line breaks
const arrayToString = (arr: string[]) => arr.join('\n');

interface AsciiAvatarProps {
  state: AvatarState;
}

// Talking animation frames
const createTalkingFrames = () => {
  return [
    arrayToString(avatars.talking),
    arrayToString(avatars.idle)
  ];
};

export const AsciiAvatar: React.FC<AsciiAvatarProps> = ({ state }) => {
  const [frame, setFrame] = useState(0);
  const talkingFrames = createTalkingFrames();
  
  useEffect(() => {
    let intervalId: number | null = null;
    
    // If talking, animate between frames
    if (state === "talking") {
      intervalId = window.setInterval(() => {
        setFrame((prev) => (prev + 1) % talkingFrames.length);
      }, 200);
    } else {
      setFrame(0);
    }
    
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [state, talkingFrames.length]);
  
  const getAvatarContent = () => {
    if (state === "idle") {
      return arrayToString(avatars.idle);
    } else if (state === "thinking") {
      return arrayToString(avatars.thinking);
    } else {
      // Return the current frame when talking
      return talkingFrames[frame];
    }
  };
  
  return (
    <div className="ascii-avatar bg-terminal-black p-2 rounded border border-terminal-green">
      <pre>{getAvatarContent()}</pre>
    </div>
  );
};

export default AsciiAvatar;

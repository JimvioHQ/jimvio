const fs = require('fs');

const file = 'c:\\Users\\pc\\Desktop\\Jimvio\\jimvio\\components\\community\\rooms\\ChatRoom.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1) Add slug to props destructuring
content = content.replace(
  `export function ChatRoom({\r\n  roomId,\r\n  roomName,\r\n  communityId,\r\n  hideHeader,\r\n}: {\r\n  roomId: string;\r\n  roomName: string;\r\n  communityId: string;\r\n  slug: string;\r\n  hideHeader?: boolean;\r\n})`,
  `export function ChatRoom({\r\n  roomId,\r\n  roomName,\r\n  communityId,\r\n  slug,\r\n  hideHeader,\r\n}: {\r\n  roomId: string;\r\n  roomName: string;\r\n  communityId: string;\r\n  slug: string;\r\n  hideHeader?: boolean;\r\n})`
);

// 2) Add useWorkspace and useRouter imports after existing imports
content = content.replace(
  `import { ChatEmojiPickerDialog } from \"@/components/community/chat/chat-emoji-picker-dialog\";\r\nimport { ChatRoomMembersAside } from \"@/components/community/chat/chat-room-members-aside\";`,
  `import { ChatEmojiPickerDialog } from \"@/components/community/chat/chat-emoji-picker-dialog\";\r\nimport { ChatRoomMembersAside } from \"@/components/community/chat/chat-room-members-aside\";\r\nimport { useRouter } from \"next/navigation\";\r\nimport { useWorkspace } from \"@/components/community/workspace-context\";`
);

// 3) Add the missing state vars after voiceStreamRef.current = null line in the cleanup effect
content = content.replace(
  `  const [voiceRecording, setVoiceRecording] = useState(false);\r\n  const mediaRecorderRef = useRef<MediaRecorder | null>(null);\r\n  const voiceChunksRef = useRef<Blob[]>([]);\r\n  const voiceStreamRef = useRef<MediaStream | null>(null);`,
  `  const [voiceRecording, setVoiceRecording] = useState(false);\r\n  const mediaRecorderRef = useRef<MediaRecorder | null>(null);\r\n  const voiceChunksRef = useRef<Blob[]>([]);\r\n  const voiceStreamRef = useRef<MediaStream | null>(null);\r\n  const msgInputRef = useRef<HTMLTextAreaElement>(null);\r\n\r\n  const { spacesWithRooms } = useWorkspace();\r\n  const router = useRouter();\r\n  const allChatRooms = spacesWithRooms.flatMap((s) => s.rooms.filter((r) => r.room_type === \"chat\").map((r) => ({spaceId: s.id, ...r})));\r\n\r\n  const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {\r\n    setText(e.target.value);\r\n    const target = e.target;\r\n    target.style.height = 'auto';\r\n    target.style.height = Math.min(target.scrollHeight, 120) + 'px';\r\n  };`
);

// 4) Remove the badly-injected code from inside filteredMessages
content = content.replace(
  `    return (m.body || \"\").toLowerCase().includes(q) || (m.profiles?.full_name || \"\").toLowerCase().includes(q);\r\n  const { spacesWithRooms } = require(\"@/components/community/workspace-context\").useWorkspace();\n  const router = require(\"next/navigation\").useRouter();\n  \n  const allChatRooms = spacesWithRooms.flatMap((s: any) => s.rooms.filter((r: any) => r.room_type === \"chat\").map((r: any) => ({spaceId: s.id, ...r})));\n  const msgInputRef = useRef<HTMLTextAreaElement>(null);\n\n  // Auto-resize textarea\n  const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {\n    setText(e.target.value);\n    const target = e.target;\n    target.style.height = 'auto';\n    target.style.height = Math.min(target.scrollHeight, 120) + 'px';\n  };\n\n  return (\n    <div className="flex flex-1 min-h-[580px] w-full overflow-hidden font-sans text-sm bg-[var(--color-bg)]">`,
  `    return (m.body || \"\").toLowerCase().includes(q) || (m.profiles?.full_name || \"\").toLowerCase().includes(q);\r\n\r\n  return (\r\n    <div className="flex flex-1 min-h-[580px] w-full overflow-hidden font-sans text-sm bg-[var(--color-bg)]">`
);

// Remove also the wrong style injection if it got attached into a middle line
// (using a broader match to fix the filteredMessages block)
const fixedContent = content.replace(
  /return \(m\.body \|\| ""\)\.toLowerCase\(\)\.includes\(q\) \|\| \(m\.profiles\?\.full_name \|\| ""\)\.toLowerCase\(\)\.includes\(q\);\n  const \{/,
  `return (m.body || "").toLowerCase().includes(q) || (m.profiles?.full_name || "").toLowerCase().includes(q);\n\n  // --- end of filteredMessages\n}\n\n  // ORPHANED --- THIS WAS THE RETURN\n  // Fix below\n  return (\n    <div className="flex flex-1 min-h-[580px] w-full overflow-hidden font-sans text-sm bg-[var(--color-bg)]"> // PLACEHOLDER BACKUP`
);

fs.writeFileSync(file, content);
console.log('Done!');

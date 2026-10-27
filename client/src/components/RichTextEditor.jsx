import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import MenuBar from "./Menu-bar";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";

const RichTextEditor = ({ input, setInput }) => {
  const handleChange = (content) => {
    setInput({ ...input, description: content });
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: { class: "list-disc ml-4" },
        },
        orderedList: {
          HTMLAttributes: { class: "list-decimal ml-4" },
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight,
    ],
    content: input?.description || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] border border-input rounded-md bg-muted text-foreground py-3 px-3 mt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      },
    },
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      handleChange(htmlContent);
    },
  });

  useEffect(() => {
    // Suspense/StrictMode can briefly reconnect effects with a destroyed editor.
    if (editor && !editor.isDestroyed && editor.schema && input?.description !== editor.getHTML()) {
      editor.commands.setContent(input?.description || "", { emitUpdate: false });
    }
  }, [editor, input?.description]);

  return (
    <div>
      {editor && <MenuBar editor={editor} />}
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
};

export default RichTextEditor;

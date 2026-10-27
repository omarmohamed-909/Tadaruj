import { ArrowDown, ArrowUp, Edit, GripVertical, PlayCircle } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

const Lecture = ({ lecture, index, totalLectures, isReordering, onReorder }) => {
  const navigate = useNavigate();
  const goToUpdateLecture = () => {
    navigate(`${lecture._id}`);
  };
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:border-border hover:bg-muted dark:border-border dark:bg-card dark:hover:border-border dark:hover:bg-secondary">
      <div className="flex items-center gap-2">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
        <div className="rounded-full bg-muted p-1.5 text-muted-foreground dark:bg-secondary dark:text-muted-foreground">
          <PlayCircle className="h-3 w-3" />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
            Lecture {index + 1}
          </p>
          <h1 className="font-semibold text-foreground dark:text-foreground text-sm">
            {lecture.lectureTitle || "Untitled lecture"}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={index === 0 || isReordering}
          onClick={() => onReorder?.(lecture._id, "up")}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          aria-label={`Move lecture ${lecture.lectureTitle || index + 1} up`}
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          disabled={index === totalLectures - 1 || isReordering}
          onClick={() => onReorder?.(lecture._id, "down")}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          aria-label={`Move lecture ${lecture.lectureTitle || index + 1} down`}
        >
          <ArrowDown size={14} />
        </button>
        <button
          type="button"
          onClick={goToUpdateLecture}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
          aria-label={`Edit lecture ${lecture.lectureTitle || index + 1}`}
        >
          <Edit size={14} />
        </button>
      </div>
    </div>
  );
};

export default Lecture;

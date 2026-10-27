import { useUiText, useFeedbackText } from "@/components/useUiText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCourseMutation } from "@/features/api/courseApi";
import BrandedLoader from "@/components/BrandedLoader";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useWorkspacePath } from "@/lib/useWorkspacePath";
import { getGradeLabel, gradeOptions, subjectSuggestions } from "@/lib/courseTaxonomy";
import { useLanguage } from "@/components/languageContext";

const AddCourse = () => {
  const feedback = useFeedbackText();
  const ui = useUiText();
  const { language } = useLanguage();
  const [courseTitle, setCourseTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  const [createCourse, { isLoading }] =
    useCreateCourseMutation();

  const navigate = useNavigate();
  const workspacePath = useWorkspacePath();

  const createCourseHandler = async () => {
    try {
      const response = await createCourse({ courseTitle: courseTitle.trim(), subject: subject.trim(), gradeLevel }).unwrap();
      toast.success(feedback(response?.message || ui("Course created."), ui("Course created.")));
      navigate(workspacePath("/course"));
    } catch (createError) {
      toast.error(feedback(createError?.data?.message || ui("Could not create course."), ui("Could not create course.")));
    }
  };

  return (
    <div className="mx-auto max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <div className="mb-4">
        <h1 className="font-bold text-xl">{" "}{ui("Start a new course")}{" "}</h1>
        <p className="text-sm">{" "}{ui("Choose a subject and a clear title. Add a school stage only if the course is tied to one.")}{" "}</p>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="course-title">{ui("Title")}</Label>
          <Input
            id="course-title"
            type="text"
            name="courseTitle"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            placeholder={ui("Your Course Name")}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="course-subject">{ui("Subject")}</Label>
          <Input id="course-subject" list="course-subject-suggestions" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={ui("e.g. Biology, Arabic, Computer Science")} className="mt-2" />
          <datalist id="course-subject-suggestions">{subjectSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
          <p className="mt-1 text-xs text-muted-foreground">{ui("Suggestions are optional. You can enter any subject.")}</p>
        </div>
        <div>
          <Label>{ui("School stage or audience")}{" "}<span className="font-normal text-muted-foreground">{ui("(optional)")}</span></Label>
          <Select value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger className="mt-2 w-full sm:w-64">
              <SelectValue placeholder={ui("Select a stage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{ui("Audience")}</SelectLabel>
                {gradeOptions.map((item) => <SelectItem key={item} value={item}>{getGradeLabel(item, language)}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(workspacePath("/course"))}>{" "}{ui("Back")}{" "}</Button>
          <Button disabled={isLoading || !courseTitle.trim() || !subject.trim()} onClick={createCourseHandler}>
            {isLoading ? (
              <>
                <BrandedLoader variant="tiny" className="mr-2" />{" "}{ui("Please wait")}{" "}</>
            ) : (
              ui("Create")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddCourse;

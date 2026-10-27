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
      toast.success(response?.message || "Course created.");
      navigate(workspacePath("/course"));
    } catch (createError) {
      toast.error(createError?.data?.message || "Could not create course.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <div className="mb-4">
        <h1 className="font-bold text-xl">
          Start a new course
        </h1>
        <p className="text-sm">
          Choose a subject and a clear title. Add a school stage only if the course is tied to one.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            type="text"
            name="courseTitle"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            placeholder="Your Course Name"
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="course-subject">Subject</Label>
          <Input id="course-subject" list="course-subject-suggestions" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Biology, Arabic, Computer Science" className="mt-2" />
          <datalist id="course-subject-suggestions">{subjectSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
          <p className="mt-1 text-xs text-muted-foreground">Suggestions are optional. You can enter any subject.</p>
        </div>
        <div>
          <Label>School stage or audience <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Select value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger className="mt-2 w-full sm:w-64">
              <SelectValue placeholder="Select a stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Audience</SelectLabel>
                {gradeOptions.map((item) => <SelectItem key={item} value={item}>{getGradeLabel(item, language)}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(workspacePath("/course"))}>
            Back
          </Button>
          <Button disabled={isLoading || !courseTitle.trim() || !subject.trim()} onClick={createCourseHandler}>
            {isLoading ? (
              <>
                <BrandedLoader variant="tiny" className="mr-2" />
                Please wait
              </>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddCourse;

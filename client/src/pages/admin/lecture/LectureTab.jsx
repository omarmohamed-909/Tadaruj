import QuizSettings from "./QuizSettings";
import { useUiText, useFeedbackText } from "@/components/useUiText";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import RichTextEditor from "@/components/RichTextEditor";
import { useEditLectureMutation, useGetLectureByIdQuery, useRemoveLectureMutation, useUpdateLectureQuizMutation } from "@/features/api/courseApi";
import { secureMediaUrl } from "@/lib/secureMediaUrl";
import { directUpload, IMAGE_ACCEPT, uploadErrorMessage } from "@/lib/directUpload";
import axios from "axios";
import { CheckCircle2, FileText, Image as ImageIcon, Link2, Lock, Paperclip, PlayCircle, Plus, Trash2, UploadCloud, Video } from "lucide-react";
import BrandedLoader from "@/components/BrandedLoader";
import React, { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { API_BASE_URL } from "@/lib/apiBaseUrl";
const MEDIA_API = `${API_BASE_URL}/api/v1/media`;
const AUTH_TOKEN_KEY = "lms_auth_token";
const resolveQuestionImageUrl = (item = {}) =>
  item.questionImageUrl || item.questionImage || item.imageUrl || item.image || "";
const resolveQuestionImagePublicId = (item = {}) =>
  item.questionImagePublicId || item.questionImagePublicID || item.imagePublicId || "";
const YOUTUBE_URL_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
const YOUTUBE_PLAYER_CONFIG = {
  youtube: {
    playerVars: {
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  },
};

const getAuthHeaders = () => {
  if (typeof window === "undefined") {
    return {};
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY) || "";

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const LectureTab = () => {
  const feedback = useFeedbackText();
  const ui = useUiText();
  const [lectureTitle, setLectureTitle] = useState("");
  const [uploadVideInfo, setUploadVideoInfo] = useState(null);
  const [isFree, setIsFree] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mediaProgress, setMediaProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadingQuestionImageIndex, setUploadingQuestionImageIndex] = useState(null);
  const [descriptionInput, setDescriptionInput] = useState({ description: "" });
  const [pdfFile, setPdfFile] = useState(null);
  const params = useParams();
  const { courseId, lectureId } = params;

  const {data:lectureData} = useGetLectureByIdQuery(lectureId, { refetchOnMountOrArgChange: true });
  const lecture = lectureData?.lecture;

  useEffect(()=>{
    if(lecture){
      setLectureTitle(lecture.lectureTitle);
      setIsFree(
        typeof lecture.previewEnabledByAdmin === "boolean"
          ? Boolean(lecture.previewEnabledByAdmin && lecture.isPreviewFree)
          : Boolean(lecture.isPreviewFree)
      );
      setUploadVideoInfo(
        lecture.videoUrl
          ? {
              videoUrl: secureMediaUrl(lecture.videoUrl),
              previewUrl: secureMediaUrl(lecture.playbackUrl || lecture.videoUrl),
              publicId: lecture.publicId || "",
            }
          : null
      );
      setYoutubeUrl(lecture.publicId ? "" : secureMediaUrl(lecture.videoUrl || ""));
      setDescriptionInput({ description: lecture.description || "" });
      setPdfFile(null);
      setQuizQuestions(
        Array.isArray(lecture.quizQuestions)
          ? lecture.quizQuestions.map((item) => ({
              questionText: item.questionText || "",
              questionImageUrl: resolveQuestionImageUrl(item),
              questionImagePublicId: resolveQuestionImagePublicId(item),
              options: Array.isArray(item.options) && item.options.length
                ? item.options
                : ["", ""],
              correctOptionIndex: Number.isInteger(item.correctOptionIndex)
                ? item.correctOptionIndex
                : 0,
            }))
          : []
      );
    }
  },[lecture])

  const [edtiLecture, { data, isLoading, error, isSuccess }] =
    useEditLectureMutation();
  const [removeLecture,{data:removeData, isLoading:removeLoading, isSuccess:removeSuccess}] = useRemoveLectureMutation();
  const [updateLectureQuiz, { data: quizData, isLoading: quizLoading, error: quizError, isSuccess: quizSuccess }] = useUpdateLectureQuizMutation();

  const fileChangeHandler = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaProgress(true);
      setIsProcessingVideo(false);
      setUploadProgress(0);
      try {
        const signatureResponse = await axios.post(
          `${MEDIA_API}/upload-video-signature`,
          {},
          {
            headers: getAuthHeaders(),
          }
        );

        const { apiKey, cloudName, folder, signature, timestamp, type } =
          signatureResponse.data.data;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", apiKey);
        formData.append("folder", folder);
        formData.append("signature", signature);
        formData.append("timestamp", timestamp);
        formData.append("type", type);

        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
          formData,
          {
          onUploadProgress: ({ loaded, total }) => {
            const safeTotal = total || file.size || loaded || 1;
            const progressValue = Math.round((loaded * 100) / safeTotal);
            setUploadProgress(progressValue);
            if (progressValue >= 100) {
              setIsProcessingVideo(true);
            }
          },
          }
        );

        if (res.data.secure_url) {
          setUploadVideoInfo({
            videoUrl: res.data.secure_url,
            publicId: res.data.public_id,
          });
          setYoutubeUrl("");
          toast.success(ui("video uploaded successfully"));
        }
      } catch (error) {
        console.log(error);
        const errorMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          ui("video upload failed");
        toast.error(feedback(errorMessage, ui("Something went wrong. Please try again.")));
      } finally {
        setIsProcessingVideo(false);
        setMediaProgress(false);
      }
    }
  };

  const youtubeUrlChangeHandler = (event) => {
    const value = event.target.value;
    setYoutubeUrl(value);

    if (!value.trim()) {
      setUploadVideoInfo(
        lecture?.videoUrl
          ? {
              videoUrl: secureMediaUrl(lecture.videoUrl),
              previewUrl: secureMediaUrl(lecture.playbackUrl || lecture.videoUrl),
              publicId: lecture.publicId || "",
            }
          : null
      );
      return;
    }

    setUploadVideoInfo({
      videoUrl: value.trim(),
      publicId: "",
    });
  };

  const addQuestion = () => {
    setQuizQuestions((currentValue) => [
      ...currentValue,
      {
        questionText: "",
        questionImageUrl: "",
        questionImagePublicId: "",
        options: ["", ""],
        correctOptionIndex: 0,
      },
    ]);
  };

  const removeQuestion = (questionIndex) => {
    setQuizQuestions((currentValue) =>
      currentValue.filter((_, index) => index !== questionIndex)
    );
  };

  const updateQuestionText = (questionIndex, value) => {
    setQuizQuestions((currentValue) =>
      currentValue.map((question, index) =>
        index === questionIndex ? { ...question, questionText: value } : question
      )
    );
  };

  const uploadQuestionImage = async (questionIndex, file) => {
    if (!file) {
      return;
    }

    setUploadingQuestionImageIndex(questionIndex);
    try {
      const uploadedImage = await directUpload(file, "quiz");
      if (uploadedImage?.secure_url) {
        setQuizQuestions((currentValue) =>
          currentValue.map((question, index) =>
            index === questionIndex
              ? {
                  ...question,
                  questionImageUrl: uploadedImage.secure_url,
                  questionImagePublicId: uploadedImage.public_id || "",
                }
              : question
          )
        );
        toast.success(ui("Question image uploaded successfully."));
      }
    } catch (error) {
      const errorMessage =
        uploadErrorMessage(error) ||
        error?.response?.data?.error?.message ||
        ui("Question image upload failed.");
      toast.error(feedback(errorMessage, ui("Something went wrong. Please try again.")));
    } finally {
      setUploadingQuestionImageIndex(null);
    }
  };

  const questionImageChangeHandler = async (questionIndex, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await uploadQuestionImage(questionIndex, file);
  };

  const removeQuestionImage = (questionIndex) => {
    setQuizQuestions((currentValue) =>
      currentValue.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              questionImageUrl: "",
              questionImagePublicId: "",
            }
          : question
      )
    );
  };

  const updateOptionText = (questionIndex, optionIndex, value) => {
    setQuizQuestions((currentValue) =>
      currentValue.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        return {
          ...question,
          options: question.options.map((option, currentOptionIndex) =>
            currentOptionIndex === optionIndex ? value : option
          ),
        };
      })
    );
  };

  const addOption = (questionIndex) => {
    setQuizQuestions((currentValue) =>
      currentValue.map((question, index) =>
        index === questionIndex
          ? { ...question, options: [...question.options, ""] }
          : question
      )
    );
  };

  const removeOption = (questionIndex, optionIndex) => {
    setQuizQuestions((currentValue) =>
      currentValue.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        if (question.options.length <= 2) {
          return question;
        }

        const nextOptions = question.options.filter((_, idx) => idx !== optionIndex);
        let nextCorrectIndex = question.correctOptionIndex;

        if (optionIndex === question.correctOptionIndex) {
          nextCorrectIndex = 0;
        } else if (optionIndex < question.correctOptionIndex) {
          nextCorrectIndex = question.correctOptionIndex - 1;
        }

        return {
          ...question,
          options: nextOptions,
          correctOptionIndex: nextCorrectIndex,
        };
      })
    );
  };

  const updateCorrectOption = (questionIndex, optionIndex) => {
    setQuizQuestions((currentValue) =>
      currentValue.map((question, index) =>
        index === questionIndex
          ? { ...question, correctOptionIndex: optionIndex }
          : question
      )
    );
  };

  const sanitizeQuizQuestions = () => {
    const output = [];

    for (const question of quizQuestions) {
      const questionText = question.questionText.trim();
      const questionImageUrl = (question.questionImageUrl || "").trim();
      const questionImagePublicId = (question.questionImagePublicId || "").trim();
      const hasAnyOptionContent = question.options.some((item) => item.trim());
      const hasQuestionContent = Boolean(questionText || questionImageUrl);

      if (!hasQuestionContent && !hasAnyOptionContent) {
        continue;
      }

      if (!hasQuestionContent) {
        toast.error(ui("Each question needs text or an image."));
        return null;
      }

      const options = question.options.map((item) => item.trim()).filter(Boolean);

      if (options.length < 2) {
        toast.error(ui("Each question needs at least 2 options."));
        return null;
      }

      if (question.correctOptionIndex < 0 || question.correctOptionIndex >= options.length) {
        toast.error(ui("Please select a valid correct answer."));
        return null;
      }

      output.push({
        questionText,
        questionImageUrl,
        questionImagePublicId,
        options,
        correctOptionIndex: question.correctOptionIndex,
      });
    }

    return output;
  };

  const editLectureHandler = async () => {
    if (!uploadVideInfo?.videoUrl) {
      toast.error(ui("Please upload a video or paste a YouTube URL."));
      return;
    }

    if (!uploadVideInfo?.publicId && !YOUTUBE_URL_PATTERN.test(uploadVideInfo.videoUrl)) {
      toast.error(ui("Please enter a valid YouTube URL."));
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const attachment = pdfFile ? await directUpload(pdfFile, "attachment") : null;
      await edtiLecture({
        lectureTitle,
        videoInfo:{ videoUrl: uploadVideInfo.videoUrl, publicId: uploadVideInfo.publicId || "" },
        isPreviewFree:isFree,
        courseId,
        lectureId,
        description: descriptionInput.description,
        attachmentAssetId: attachment?.public_id,
      });
    } catch (error) {
      toast.error(feedback(uploadErrorMessage(error), ui("Upload failed. Please try again.")));
    } finally { setIsUploadingAttachment(false); }
  };

  const saveQuizHandler = async () => {
    const sanitizedQuizQuestions = sanitizeQuizQuestions();
    if (sanitizedQuizQuestions === null) {
      return;
    }

    await updateLectureQuiz({
      courseId,
      lectureId,
      quizQuestions: sanitizedQuizQuestions,
    });
  };

  const removeLectureHandler = async () => {
    await removeLecture(lectureId);
  }

  const lectureErrorMessage =
    error?.data?.message ||
    error?.error ||
    ui("Failed to update lecture.");

  useEffect(() => {
    if (isSuccess) {
      toast.success(feedback(data.message, ui("Changes saved.")));
      setPdfFile(null);
    }
    if (error) {
      toast.error(feedback(lectureErrorMessage, ui("Something went wrong. Please try again.")));
    }
  }, [isSuccess, error, data?.message, lectureErrorMessage, feedback, ui]);

  useEffect(() => {
    if (quizSuccess) {
      toast.success(feedback(quizData?.message || ui("Lecture quiz updated successfully."), ui("Lecture quiz updated successfully.")));
    }
    if (quizError) {
      toast.error(feedback(quizError?.data?.message || ui("Failed to update lecture quiz."), ui("Failed to update lecture quiz.")));
    }
  }, [quizSuccess, quizError, quizData?.message, ui, feedback]);

  useEffect(()=>{
    if(removeSuccess){
      toast.success(feedback(removeData.message, ui("Changes saved.")));
    }
  },[removeSuccess, removeData?.message, feedback, ui])

  const selectedVideoName = uploadVideInfo?.videoUrl
    ? uploadVideInfo.publicId
      ? uploadVideInfo.videoUrl.split("/").pop()
      : ui("YouTube link attached")
    : ui("No video selected yet");
  const isYoutubeVideo = Boolean(uploadVideInfo?.videoUrl) && !uploadVideInfo?.publicId;

  return (
    <Card className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card sm:rounded-[30px]">
      <CardHeader className="flex flex-col gap-4 border-b border-border/70 bg-muted/80 px-4 py-4 dark:border-border dark:bg-secondary/40 sm:px-6 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <CardTitle className="text-[1.85rem] sm:text-2xl">{ui("Edit Lecture")}</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">{" "}{ui("Update the lecture title, replace the attached video, and decide whether learners can preview it before purchasing.")}{" "}</CardDescription>
        </div>
        <Button
          disabled={removeLoading}
          variant="destructive"
          onClick={removeLectureHandler}
          className="h-10 rounded-2xl px-4 text-sm font-semibold sm:h-11 sm:px-5 sm:text-base"
        >
          {removeLoading ? (
            <>
              <BrandedLoader variant="tiny" className="mr-2" />{" "}{ui("Please wait")}{" "}</>
          ) : (
            ui("Remove Lecture")
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6 md:p-8">
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <Label className="mb-3 block text-sm font-semibold text-foreground dark:text-foreground">{ui("Title")}</Label>
              <Input
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
                type="text"
                placeholder={ui("Ex. Introduction to Javascript")}
                className="h-12 rounded-2xl border-border bg-muted dark:border-border dark:bg-secondary"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm font-semibold text-foreground dark:text-foreground">{" "}{ui("Video")}{" "}<span className="text-red-500">*</span>
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("Upload a file or paste a YouTube link. The latest source you set will be used.")}{" "}</p>
                </div>
                <div className="rounded-2xl bg-muted p-3 text-muted-foreground dark:bg-secondary dark:text-muted-foreground">
                  <UploadCloud className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted p-4 dark:border-border dark:bg-secondary/70">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={fileChangeHandler}
                  className="h-12 rounded-2xl border-border bg-card dark:border-border dark:bg-card"
                />
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  <Video className="h-4 w-4" />
                  <span className="truncate">{selectedVideoName}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-card p-4 dark:border-border dark:bg-card">
                <Label className="text-sm font-semibold text-foreground dark:text-foreground">{" "}{ui("YouTube URL")}{" "}</Label>
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-3 dark:border-border dark:bg-secondary/70 sm:gap-3 sm:px-4">
                  <Link2 className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                  <Input
                    type="url"
                    value={youtubeUrl}
                    onChange={youtubeUrlChangeHandler}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="border-none bg-transparent px-0 py-0 text-sm text-foreground focus-visible:ring-0 dark:text-foreground"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">{" "}{ui("Paste a YouTube link if you do not want to upload the video file manually.")}{" "}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm font-semibold text-foreground dark:text-foreground">{" "}{ui("Description")}{" "}</Label>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("Provide a detailed description of this lecture to help students understand what they will learn.")}{" "}</p>
                </div>
                <div className="rounded-2xl bg-muted p-3 text-muted-foreground dark:bg-secondary dark:text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <RichTextEditor input={descriptionInput} setInput={setDescriptionInput} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm font-semibold text-foreground dark:text-foreground">{" "}{ui("Attachment (PDF)")}{" "}</Label>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("Optionally attach a PDF file for students to download alongside this lecture.")}{" "}</p>
                </div>
                <div className="rounded-2xl bg-muted p-3 text-muted-foreground dark:bg-secondary dark:text-muted-foreground">
                  <Paperclip className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted p-4 dark:border-border dark:bg-secondary/70">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 10 * 1024 * 1024) {
                      toast.error(ui("PDF file must be 10 MB or smaller."));
                      e.target.value = "";
                      return;
                    }
                    setPdfFile(file);
                  }}
                  className="h-12 rounded-2xl border-border bg-card dark:border-border dark:bg-card"
                />
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">
                    {pdfFile
                      ? pdfFile.name
                      : lecture?.attachmentUrl
                        ? ui("PDF already attached — upload a new file to replace it")
                        : ui("No PDF selected yet")}
                  </span>
                </div>
                {lecture?.attachmentUrl && !pdfFile && (
                  <a
                    href={lecture.attachmentDownloadUrl || lecture.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent-foreground hover:underline dark:text-accent-foreground"
                  >
                    <Paperclip className="h-3.5 w-3.5" />{" "}{ui("View current attachment")}{" "}</a>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted px-3 py-3 dark:bg-secondary/60 sm:px-4 sm:py-4">
                <div>
                  <Label htmlFor="lecture-preview-toggle" className="text-base font-semibold text-foreground dark:text-foreground">{" "}{ui("Is this video FREE")}{" "}</Label>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("Control whether this lecture can be previewed before purchase.")}{" "}</p>
                </div>
                <Switch checked={isFree} onCheckedChange={setIsFree} id="lecture-preview-toggle" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label className="text-base font-semibold text-foreground dark:text-foreground">{" "}{ui("Optional Quiz Questions")}{" "}</Label>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("Add multiple-choice questions for this lecture if needed.")}{" "}</p>
                </div>
                <Button type="button" variant="outline" className="h-10 w-full rounded-2xl text-sm sm:h-11 sm:w-auto" onClick={addQuestion}>
                  <Plus className="mr-2 h-4 w-4" />{" "}{ui("Add question")}{" "}</Button>
              </div>

              {lecture && <QuizSettings key={`${lectureId}:${lecture.quizMaxAttempts}:${lecture.quizPassPercentage}`} lecture={lecture} courseId={courseId} lectureId={lectureId} />}
              {quizQuestions.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground dark:border-border dark:bg-secondary/70 dark:text-muted-foreground">{" "}{ui("No quiz questions added yet.")}{" "}</div>
              ) : (
                <div className="mt-4 space-y-4">
                  {quizQuestions.map((question, questionIndex) => (
                    <div key={questionIndex} className="rounded-2xl border border-border bg-muted p-3 dark:border-border dark:bg-secondary/70 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground dark:text-foreground">{" "}{ui("Question")}{" "}{questionIndex + 1}
                        </p>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(questionIndex)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <Input
                        value={question.questionText}
                        onChange={(event) => updateQuestionText(questionIndex, event.target.value)}
                        placeholder={ui("Write your question (optional if image exists)")}
                        className="mb-3 rounded-xl"
                      />

                      <div className="mb-3 rounded-xl border border-dashed border-border bg-card p-3 dark:border-border dark:bg-card/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                            <ImageIcon className="h-3.5 w-3.5" />{" "}{ui("Question image (optional)")}{" "}</Label>
                          {question.questionImageUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 rounded-lg px-2 text-xs text-red-600 hover:text-red-700"
                              onClick={() => removeQuestionImage(questionIndex)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />{" "}{ui("Remove image")}{" "}</Button>
                          )}
                        </div>
                        <Input
                          type="file"
                          accept={IMAGE_ACCEPT}
                          onChange={(event) => questionImageChangeHandler(questionIndex, event)}
                          disabled={uploadingQuestionImageIndex === questionIndex}
                          className="mt-2 h-10 rounded-xl"
                        />
                        {uploadingQuestionImageIndex === questionIndex && (
                          <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">{" "}{ui("Uploading image...")}{" "}</p>
                        )}
                        {question.questionImageUrl && (
                          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">{" "}{ui("Image uploaded successfully.")}{" "}</p>
                        )}
                        {question.questionImageUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-muted dark:border-border dark:bg-secondary">
                            <img
                              src={secureMediaUrl(question.questionImageUrl)}
                              alt={ui("Question {0}", questionIndex + 1)}
                              className="max-h-52 w-full object-contain"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-1.5 sm:gap-2">
                            <input
                              type="radio"
                              name={`question-correct-${questionIndex}`}
                              checked={question.correctOptionIndex === optionIndex}
                              onChange={() => updateCorrectOption(questionIndex, optionIndex)}
                              className="h-4 w-4"
                            />
                            <Input
                              value={option}
                              onChange={(event) =>
                                updateOptionText(questionIndex, optionIndex, event.target.value)
                              }
                              placeholder={ui("Option {0}", optionIndex + 1)}
                              className="rounded-xl"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={question.options.length <= 2}
                              onClick={() => removeOption(questionIndex, optionIndex)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex justify-end">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => addOption(questionIndex)}>
                          <Plus className="mr-2 h-4 w-4" />{" "}{ui("Add option")}{" "}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button type="button" onClick={saveQuizHandler} disabled={quizLoading} className="h-10 w-full rounded-2xl text-sm sm:h-11 sm:w-auto">
                  {quizLoading ? (
                    <>
                      <BrandedLoader variant="tiny" className="mr-2" />{" "}{ui("Saving quiz...")}{" "}</>
                  ) : (
                    ui("Save Quiz Questions")
                  )}
                </Button>
              </div>
            </div>

            {mediaProgress && (
              <div className="rounded-2xl border border-border bg-accent p-4 dark:border-border/20 dark:bg-accent sm:rounded-3xl sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground dark:text-foreground">
                    {isProcessingVideo ? ui("Processing video") : ui("Uploading video")}
                  </p>
                  <span className="rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground dark:bg-card/60 dark:text-foreground">
                    {uploadProgress}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-3 bg-card/60 dark:bg-card/60" />
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  {isProcessingVideo && <BrandedLoader variant="tiny" />}
                  <p>
                    {isProcessingVideo
                      ? ui("Upload reached 100%. Server is processing the video and sending it to Cloudinary...")
                      : ui("{0}% uploaded", uploadProgress)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">{" "}{ui("Visibility status")}{" "}</p>
              <div className="rounded-2xl border border-border bg-muted p-4 dark:border-border dark:bg-secondary/60">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-foreground">
            {isFree ? <PlayCircle size={16} /> : <Lock size={16} />}
            {isFree ? ui("Visible in course preview") : ui("Locked until the course is purchased")}
                </div>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  {isFree
                    ? ui("Students can open this lecture from the course card before purchasing.")
                    : ui("Students will see a locked lecture in the course card until they buy the full course.")}
                </p>
              </div>
            </div>

            {uploadVideInfo?.videoUrl && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />{" "}{ui("Current lecture video")}{" "}</div>
                {uploadVideInfo.publicId && uploadVideInfo.videoUrl.includes("/authenticated/") && !uploadVideInfo.previewUrl ? (
                  <p className="mb-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground dark:bg-secondary dark:text-muted-foreground">{" "}{ui("Video uploaded. Save the lecture to preview it.")}{" "}</p>
                ) : (
                  <div className="mb-3 overflow-hidden rounded-2xl bg-black">
                    <ReactPlayer
                      src={secureMediaUrl(uploadVideInfo.previewUrl || uploadVideInfo.videoUrl)}
                      controls
                      config={YOUTUBE_PLAYER_CONFIG}
                      width="100%"
                      height="100%"
                      className="aspect-video"
                    />
                  </div>
                )}
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  {isYoutubeVideo
                    ? ui("This lecture is linked from YouTube. You can replace it by pasting another link or uploading a file.")
                    : ui("A video is already attached to this lecture. You only need to upload again if you want to replace it.")}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-5 dark:border-border sm:flex-row sm:items-center sm:justify-between sm:pt-6">
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("Save your changes after updating the title, visibility, uploaded video, or YouTube link.")}{" "}</p>
          <Button
            disabled={isLoading || isUploadingAttachment || mediaProgress}
            onClick={editLectureHandler}
            className="h-11 w-full rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:h-12 sm:w-auto sm:px-6 sm:text-base"
          >
            {isLoading || isUploadingAttachment ? (
              <>
                <BrandedLoader variant="tiny" className="mr-2" />{" "}{ui("Please wait")}{" "}</>
            ) : mediaProgress ? (
              <>
                <BrandedLoader variant="tiny" className="mr-2" />{" "}{ui("Uploading video...")}{" "}</>
            ) : (
              ui("Update Lecture")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LectureTab;

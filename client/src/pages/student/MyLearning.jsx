import { useUiText } from "@/components/useUiText";
import React from "react";
import Course from "./Course";
import { useLoadUserQuery } from "@/features/api/authApi";
import BrandedLoader from "@/components/BrandedLoader";

const MyLearning = () => {
  const ui = useUiText();
  const {data,isLoading}= useLoadUserQuery(undefined, { refetchOnMountOrArgChange: true });

  const myLearning = data?.user?.enrolledCourses || [];
  return (
    <div className="max-w-4xl mx-auto my-10 px-4 md:px-0">
      <h1 className="font-bold text-2xl">{ui("MY LEARNING")}</h1>
      <div className="my-5">
        {isLoading ? (
          <BrandedLoader />
        ) : myLearning.length === 0 ? (
          <p>{ui("You are not enrolled in any courses.")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {myLearning.map((course, index) => (
              <Course key={index} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default MyLearning;

"use-client";
import Image from "next/image";
import React from "react";
import BlurText from "../ui/BlurText";
import TextType from "../ui/TypeText";
type AuthHeaderProps = {
  isLogin: boolean;
  step: "form" | "otp";
};

const AuthHeader: React.FC<AuthHeaderProps> = ({ isLogin, step }) => {
  return (
    <div className="flex flex-col items-center">
      <Image
        src="/DisasterWatch.png"
        alt="techtantra"
        width={100}
        height={100}
        className="mb-4 rounded-full"
        priority
      />
      <h1 className="text-2xl font-semibold text-white mb-2">
        {step === "form" ? (
          isLogin ? (
            <BlurText
              text="Log in to your account"
              delay={200}
              animateBy="words"
              direction="top"
              className="text-2xl"
            />
          ) : (
            <BlurText
              text="Create an account"
              delay={200}
              animateBy="words"
              direction="top"
              className="text-2xl"
            />
          )
        ) : (
          "Verify OTP"
        )}
      </h1>
      {isLogin ? (
        <TextType
          text={["Welcome back! Please enter your details."]}
          typingSpeed={75}
          pauseDuration={1500}
          showCursor={true}
          cursorCharacter="|"
          className="text-gray-400 mb-6 text-center"
        />
      ) : (
        <p className="text-gray-400 mb-6 text-center">
          Sign up to get started with us.
        </p>
      )}
    </div>
  );
};

export default AuthHeader;

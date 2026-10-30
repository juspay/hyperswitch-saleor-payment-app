import React from "react";
import dynamic from "next/dynamic";
import animationData from "../../lotties/hyperswitch_loader.json";
import { Box, type BoxProps } from "@saleor/macaw-ui";

// lottie-web touches `document` at import time whenever a global `navigator` exists,
// which Node 21+ provides, so it must only be loaded in the browser
const Lottie = dynamic(() => import("react-lottie"), { ssr: false });

export const Skeleton = ({ className, ...props }: BoxProps) => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  return <Lottie options={defaultOptions} height={400} width={400} />;
};

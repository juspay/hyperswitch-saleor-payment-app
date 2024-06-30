import React from 'react';
import Lottie from 'react-lottie';
import animationData from '../../lotties/hyperswitch_loader.json';
import { Box, type BoxProps } from "@saleor/macaw-ui";

export const Skeleton = ({ className, ...props }: BoxProps) => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  return <Lottie options={defaultOptions} height={400} width={400} />;
};

import { Box, type BoxProps } from "@saleor/macaw-ui";
import classNames from "classnames";
import { skeleton } from "./Skeleton.css";

export const Skeleton = ({ className, ...props }: BoxProps) => {
  return (
    <Box
      className={classNames(skeleton, className)}
      backgroundColor="accent1"
      width="100%"
      height={1}
      borderRadius={2}
      {...props}
    />
  );
};

import { Chip, Text } from "@saleor/macaw-ui";
import { type ReactNode } from "react";

export const ChipNeutral = ({ children }: { children: ReactNode }) => (
  <Chip size="medium" backgroundColor="default1Focused">
    <Text size={2}>{children}</Text>
  </Chip>
);
export const ChipDanger = ({ children }: { children: ReactNode }) => (
  <Chip size="medium" backgroundColor="defaultDisabled" borderColor="default1Hovered">
    <Text color="critical1" size={2}>
      {children}
    </Text>
  </Chip>
);
export const ChipHyperswitchOrange = ({ children }: { children: ReactNode }) => (
  <Chip size="medium" __backgroundColor="#ed6704">
    <Text __color="white" size={2}>
      {children}
    </Text>
  </Chip>
);
export const ChipSuccess = ({ children }: { children: ReactNode }) => (
  <Chip size="medium" backgroundColor="default3" borderColor="critical1">
    <Text color="default2" size={2}>
      {children}
    </Text>
  </Chip>
);
export const ChipInfo = ({ children }: { children: ReactNode }) => (
  <Chip size="medium" backgroundColor="defaultDisabled" borderColor="critical1">
    <Text color="default2" size={2}>
      {children}
    </Text>
  </Chip>
);

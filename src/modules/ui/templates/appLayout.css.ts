import { sprinkles } from "@saleor/macaw-ui";
import { recipe } from "@vanilla-extract/recipes";

export const appLayoutBoxRecipe = recipe({
  base: {
    gridTemplateColumns: "5fr 9fr",
    columnGap: "7%",
  },
  variants: {
    disabled: {
      true: {
        opacity: 0.6,
        cursor: "not-allowed",
      },
      false: {
        opacity: 1,
      },
    },
    error: { true: {}, false: {} },
  },
});

export const appLayoutTextRecipe = recipe({
  variants: {
    disabled: { true: {}, false: {} },
    error: { true: {}, false: {} },
  },
  compoundVariants: [
    {
      variants: {
        disabled: false,
        error: false,
      },
      style: sprinkles({
        color: "default1",
      }),
    },
    {
      variants: {
        disabled: true,
        error: false,
      },
      style: sprinkles({
        color: "default1",
      }),
    },
    {
      variants: {
        disabled: false,
        error: true,
      },
      style: sprinkles({
        color: "critical1",
      }),
    },
    {
      variants: {
        disabled: true,
        error: true,
      },
      style: sprinkles({
        color: "default1",
      }),
    },
  ],
});

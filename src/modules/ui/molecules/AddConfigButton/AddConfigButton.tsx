import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Box, Button, TrashBinIcon, type ButtonProps, Text, Input } from "@saleor/macaw-ui";
import { type MouseEventHandler, useCallback, useState } from "react";
import { modalOverlay, modal } from "../../atoms/modal.css";
import { useRouter } from "next/router";

type AddConfigButtonProps = Omit<ButtonProps, "type" | "onClick"> & {};

type State = "idle" | "prompt" | "inProgress";

export const AddConfigButton = ({ ...props }: AddConfigButtonProps) => {
  const [state, setState] = useState<State>("idle");
  const router = useRouter();

  const handleAddConfigClick = useCallback<MouseEventHandler<HTMLButtonElement>>((e) => {
    e.preventDefault();
    setState("prompt");
  }, []);

  const handleOutsideIndiaClick = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (e) => {
      e.preventDefault();
      void router.replace("/configurations/add/hyperswitch");
    },
    [router],
  );

  const handleIndiaClick = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (e) => {
      e.preventDefault();
      void router.replace("/configurations/add/juspay");
    },
    [router],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setState(open ? "prompt" : "idle");
  }, []);

  return (
    <>
      <AlertDialog.Root
        open={state === "prompt" || state === "inProgress"}
        onOpenChange={handleOpenChange}
      >
        <AlertDialog.Trigger asChild>
          <Button {...props} type="button" onClick={handleAddConfigClick} />
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={modalOverlay} />
          <AlertDialog.Content className={modal}>
            <AlertDialog.Title asChild>
              <Text textAlign="center" fontWeight="bold" sizes="medium">
                Please select the payment region
              </Text>
            </AlertDialog.Title>

            <Box display="flex" justifyContent="space-around" gap={1.5} marginTop={5}>
              <AlertDialog.Action asChild>
                <Button
                  type="button"
                  size="medium"
                  variant="primary"
                  width={32}
                  onClick={handleOutsideIndiaClick}
                >
                  <Text
                    color={state === "inProgress" ? "buttonDefaultPrimary" : "buttonDefaultPrimary"}
                    as="p"
                    sizes="medium"
                  >
                    Outside India
                  </Text>
                </Button>
              </AlertDialog.Action>
              <AlertDialog.Action asChild>
                <Button
                  type="button"
                  size="medium"
                  variant="primary"
                  width={32}
                  onClick={handleIndiaClick}
                >
                  <Text
                    color={
                      state === "inProgress" ? "buttonDefaultTertiary" : "buttonDefaultPrimary"
                    }
                    as="p"
                    sizes="medium"
                  >
                    India
                  </Text>
                </Button>
              </AlertDialog.Action>
            </Box>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
};

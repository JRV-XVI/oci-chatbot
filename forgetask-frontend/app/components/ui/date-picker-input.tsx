"use client";

import * as React from "react";
import dayjs, { Dayjs } from "dayjs";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { cn } from "./utils";

interface DatePickerInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  testId?: string;
}

export function DatePickerInput({
  id,
  value,
  onChange,
  disabled,
  label,
  className,
  testId,
}: DatePickerInputProps) {
  const parsedValue = React.useMemo(() => {
    if (!value) {
      return null;
    }

    const parsed = dayjs(value, "YYYY-MM-DD", true);
    return parsed.isValid() ? parsed : null;
  }, [value]);

  const handleChange = React.useCallback(
    (nextValue: Dayjs | null) => {
      if (!nextValue || !nextValue.isValid()) {
        onChange("");
        return;
      }
      onChange(nextValue.format("YYYY-MM-DD"));
    },
    [onChange]
  );

  const pickerTheme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",
          primary: { main: "#e76b36" },
          background: { default: "#010409", paper: "#0D1117" },
          text: { primary: "#ffd5c2", secondary: "#ffb693" },
        },
      }),
    []
  );

  const pickerSlotProps = {
    textField: {
      id,
      inputProps: testId ? { "data-testid": testId } : undefined,
      size: "small",
      fullWidth: true,
      placeholder: "yyyy-mm-dd",
      sx: {
        "& .MuiOutlinedInput-root": {
          color: "var(--color-foreground)",
          backgroundColor: "#0D1117",
          borderRadius: "0.5rem",
          boxShadow: "0 0 0 transparent",
          transition: "box-shadow 150ms ease, border-color 150ms ease",
          "& fieldset": {
            borderColor: "var(--color-border)",
          },
          "&:hover fieldset": {
            borderColor: "#e76b36",
          },
          "&.Mui-focused fieldset": {
            borderColor: "#e76b36",
          },
          "&.Mui-focused": {
            boxShadow: "0 0 12px rgba(231, 107, 54, 0.45)",
          },
        },
        "& .MuiInputBase-input": {
          py: "8.5px",
          color: "#ffd5c2 !important",
          WebkitTextFillColor: "#ffd5c2 !important",
          caretColor: "#ffd5c2",
        },
        "& .MuiPickersSectionList-root": {
          color: "#ffd5c2 !important",
        },
        "& .MuiPickersSectionList-section": {
          color: "#ffd5c2 !important",
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          color: "#ffd5c2 !important",
        },
        "& .MuiPickersInputBase-sectionContent": {
          color: "#ffd5c2 !important",
        },
        "& .MuiPickersInputBase-placeholder": {
          color: "#ffb693 !important",
          opacity: 1,
        },
        "& .MuiInputBase-input::placeholder": {
          color: "#ffb693 !important",
          opacity: 1,
          WebkitTextFillColor: "#ffb693 !important",
        },
        "& input": {
          color: "#ffd5c2 !important",
          WebkitTextFillColor: "#ffd5c2 !important",
        },
        "& input::placeholder": {
          color: "#ffb693 !important",
          opacity: 1,
          WebkitTextFillColor: "#ffb693 !important",
        },
        "& .MuiIconButton-root": {
          color: "#e76b36",
          filter: "drop-shadow(0 0 4px rgba(231, 107, 54, 0.6))",
        },
        "& .MuiFormLabel-root": {
          color: "var(--color-muted-foreground)",
        },
        "& .MuiFormLabel-root.Mui-focused": {
          color: "#e76b36",
          textShadow: "0 0 8px rgba(231, 107, 54, 0.5)",
        },
      },
    },
    popper: {
      sx: {
        "& .MuiPaper-root": {
          backgroundColor: "#0D1117",
          color: "#ffd5c2",
          border: "1px solid rgba(146,56,17,0.7)",
          boxShadow: "0 0 16px rgba(231,107,54,0.25)",
        },
        "& .MuiPickersCalendarHeader-label": {
          color: "#ffd5c2",
        },
        "& .MuiDayCalendar-weekDayLabel": {
          color: "#ffb693",
        },
        "& .MuiIconButton-root": {
          color: "#e76b36",
        },
        "& .MuiTypography-root": {
          color: "#ffd5c2",
        },
        "& .MuiPickersDay-root": {
          color: "#ffd5c2",
        },
        "& .MuiPickersDay-root.Mui-selected": {
          backgroundColor: "#e76b36",
          color: "#fff5ef",
          boxShadow: "0 0 10px rgba(231,107,54,0.55)",
        },
        "& .MuiPickersDay-root.Mui-selected:hover": {
          backgroundColor: "#f17f4f",
        },
        "& .MuiPickersYear-yearButton": {
          color: "#ffd5c2",
        },
        "& .MuiPickersYear-yearButton.Mui-selected": {
          color: "#fff5ef",
          backgroundColor: "#e76b36",
        },
        "& .MuiPickersMonth-monthButton": {
          color: "#ffd5c2",
        },
        "& .MuiPickersMonth-monthButton.Mui-selected": {
          color: "#fff5ef",
          backgroundColor: "#e76b36",
        },
      },
    },
    desktopPaper: {
      sx: {
        backgroundColor: "#0D1117",
        color: "#ffd5c2",
        border: "1px solid rgba(146,56,17,0.7)",
      },
    },
    mobilePaper: {
      sx: {
        backgroundColor: "#0D1117",
        color: "#ffd5c2",
      },
    },
  } as const;

  return (
    <div className={cn("w-full", className)}>
      <ThemeProvider theme={pickerTheme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DemoContainer components={["DatePicker"]} sx={{ p: 0 }}>
            <DatePicker
              label={label}
              value={parsedValue}
              onChange={handleChange}
              format="YYYY-MM-DD"
              enableAccessibleFieldDOMStructure
              disabled={disabled}
              slotProps={pickerSlotProps}
            />
          </DemoContainer>
        </LocalizationProvider>
      </ThemeProvider>
    </div>
  );
}

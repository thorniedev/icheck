"use client";

import { format } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";

const classFormOptions = {
  programTypes: ["Scholarship", "Associate", "Bachelor"],
  classNames: ["Full-Stack", "Foundation", "IT Professional", "Pre-Fundamental"],
  generations: ["Generation 1", "Generation 2", "Generation 3"],
  years: ["Year 1", "Year 2", "Year 3", "Year 4"],
  semesters: ["Semester 1", "Semester 2"],
  shifts: ["Morning", "Afternoon", "Evening"],
};

const createClassSchema = z.object({
  programType: z.string().min(1, "required to select"),

  className: z.string().min(1, {
    message: "Class name is required",
  }),

  generation: z.string().min(1, {
    message: "Generation is required",
  }),

  year: z.string().min(1, {
    message: "Year is required",
  }),

  semester: z.string().min(1, {
    message: "Semester is required",
  }),

  shift: z.string().min(1, {
    message: "Shift is required",
  }),

  startDate: z.date(),

  endDate: z.date(),
});

type CreateClassForm = z.infer<typeof createClassSchema>;

export default function CreatingClassForm() {
  const form = useForm<CreateClassForm>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      programType: "",
      className: "",
      generation: "",
      year: "",
      semester: "",
      shift: "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  function onSubmit(values: CreateClassForm) {
    console.log(values);
  }

  function onReset() {
    form.reset();
    form.clearErrors();
  }

  return (
    <form
      className="mx-auto w-full max-w-3xl"
      onSubmit={form.handleSubmit(onSubmit)}
      onReset={onReset}
    >
      <FieldGroup className="gap-6">
        <FieldSet className="gap-6">
          <div className="space-y-1">
            <FieldLegend className="text-xl font-semibold">
              Create Class
            </FieldLegend>
            <FieldDescription>
              Set the program, class details, shift, and study dates.
            </FieldDescription>
          </div>

          <FieldGroup className="gap-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Controller
                control={form.control}
                name="programType"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Program type</FieldLabel>
                    <Combobox
                      items={classFormOptions.programTypes}
                      name={field.name}
                      value={field.value || null}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <ComboboxInput
                        className="w-full"
                        ref={field.ref}
                        onBlur={field.onBlur}
                        placeholder="Select a program"
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item} value={item}>
                              {item}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="className"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Class Name</FieldLabel>

                    <Combobox
                      items={classFormOptions.classNames}
                      name={field.name}
                      value={field.value || null}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <ComboboxInput
                        className="w-full"
                        ref={field.ref}
                        onBlur={field.onBlur}
                        placeholder="Select a class"
                      />

                      <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>

                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item} value={item}>
                              {item}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="generation"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Generation</FieldLabel>

                      <Combobox
                        items={classFormOptions.generations}
                        name={field.name}
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? "")}
                      >
                        <ComboboxInput
                          className="w-full"
                          ref={field.ref}
                          onBlur={field.onBlur}
                          placeholder="Select generation"
                        />

                        <ComboboxContent>
                          <ComboboxEmpty>No items found.</ComboboxEmpty>

                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="year"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Year</FieldLabel>

                      <Combobox
                        items={classFormOptions.years}
                        name={field.name}
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? "")}
                      >
                        <ComboboxInput
                          className="w-full"
                          ref={field.ref}
                          onBlur={field.onBlur}
                          placeholder="Select year"
                        />

                        <ComboboxContent>
                          <ComboboxEmpty>No items found.</ComboboxEmpty>

                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="semester"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Semester</FieldLabel>

                      <Combobox
                        items={classFormOptions.semesters}
                        name={field.name}
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? "")}
                      >
                        <ComboboxInput
                          className="w-full"
                          ref={field.ref}
                          onBlur={field.onBlur}
                          placeholder="Select semester"
                        />

                        <ComboboxContent>
                          <ComboboxEmpty>No items found.</ComboboxEmpty>

                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Controller
                control={form.control}
                name="shift"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Shift</FieldLabel>

                    <Combobox
                      items={classFormOptions.shifts}
                      name={field.name}
                      value={field.value || null}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <ComboboxInput
                        className="w-full"
                        ref={field.ref}
                        onBlur={field.onBlur}
                        placeholder="Select shift"
                      />

                      <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>

                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item} value={item}>
                              {item}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Start at</FieldLabel>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            type="button"
                            className="w-full min-w-0 justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 size-4 shrink-0" />

                            {field.value ? (
                              <span className="truncate">
                                {format(field.value, "PPP")}
                              </span>
                            ) : (
                              <span className="truncate text-muted-foreground">
                                Pick start date
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>End at</FieldLabel>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            type="button"
                            className="w-full min-w-0 justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 size-4 shrink-0" />

                            {field.value ? (
                              <span className="truncate">
                                {format(field.value, "PPP")}
                              </span>
                            ) : (
                              <span className="truncate text-muted-foreground">
                                Pick end date
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </PopoverContent>
                      </Popover>

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        <Field className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="sm:w-24" variant="outline" type="reset">
            Cancel
          </Button>

          <Button type="submit" className="bg-blue-600 sm:w-24">
            Start
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

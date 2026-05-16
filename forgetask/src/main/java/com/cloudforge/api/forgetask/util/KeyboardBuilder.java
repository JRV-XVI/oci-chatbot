package com.cloudforge.api.forgetask.util;

import com.cloudforge.api.forgetask.dto.SprintOptionDTO;
import com.cloudforge.api.forgetask.dto.TaskAssigneeOptionDTO;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;

import java.util.List;

/**
 * Utilidad para generar teclados (keyboards) de Telegram con opciones multiples
 */
public class KeyboardBuilder {

    /**
     * Construye un teclado para seleccionar prioridad
     */
    public static ReplyKeyboardMarkup buildPriorityKeyboard() {
        KeyboardRow row1 = new KeyboardRow();
        row1.add("HIGH");
        row1.add("MEDIUM");
        row1.add("LOW");

        KeyboardRow row2 = new KeyboardRow();
        row2.add("Back");
        row2.add("Cancel");

        return ReplyKeyboardMarkup.builder()
                .keyboardRow(row1)
                .keyboardRow(row2)
                .resizeKeyboard(true)
                .oneTimeKeyboard(true)
                .selective(true)
                .build();
    }

    /**
     * Construye un teclado para seleccionar sprint
     */
    public static ReplyKeyboardMarkup buildSprintKeyboard(List<SprintOptionDTO> sprints) {
        ReplyKeyboardMarkup.ReplyKeyboardMarkupBuilder builder = ReplyKeyboardMarkup.builder()
                .resizeKeyboard(true)
                .oneTimeKeyboard(true)
                .selective(true);

        for (int i = 0; i < sprints.size(); i += 2) {
            KeyboardRow row = new KeyboardRow();
            row.add(sprints.get(i).getTitle());
            if (i + 1 < sprints.size()) {
                row.add(sprints.get(i + 1).getTitle());
            }
            builder.keyboardRow(row);
        }

        KeyboardRow optionsRow = new KeyboardRow();
        optionsRow.add("Back");
        optionsRow.add("Cancel");
        builder.keyboardRow(optionsRow);

        return builder.build();
    }

    /**
     * Construye un teclado para seleccionar usuario asignado.
     * No incluye "Unassigned" — la asignacion es obligatoria.
     */
    public static ReplyKeyboardMarkup buildAssigneeKeyboard(List<TaskAssigneeOptionDTO> assignees) {
        ReplyKeyboardMarkup.ReplyKeyboardMarkupBuilder builder = ReplyKeyboardMarkup.builder()
                .resizeKeyboard(true)
                .oneTimeKeyboard(true)
                .selective(true);

        for (int i = 0; i < assignees.size(); i += 2) {
            KeyboardRow row = new KeyboardRow();
            row.add(assignees.get(i).getUsername());
            if (i + 1 < assignees.size()) {
                row.add(assignees.get(i + 1).getUsername());
            }
            builder.keyboardRow(row);
        }

        KeyboardRow optionsRow = new KeyboardRow();
        optionsRow.add("Back");
        optionsRow.add("Cancel");
        builder.keyboardRow(optionsRow);

        return builder.build();
    }

    /**
     * Construye un teclado para confirmacion si/no
     */
    public static ReplyKeyboardMarkup buildConfirmationKeyboard() {
        KeyboardRow row = new KeyboardRow();
        row.add("Yes, create");
        row.add("Cancel");

        return ReplyKeyboardMarkup.builder()
                .keyboardRow(row)
                .resizeKeyboard(true)
                .oneTimeKeyboard(true)
                .selective(true)
                .build();
    }

    /**
     * Construye un teclado para campos opcionales (con boton SKIP).
     * Usar solo para campos que el usuario puede omitir.
     */
    public static ReplyKeyboardMarkup buildOptionalFieldKeyboard() {
        KeyboardRow row = new KeyboardRow();
        row.add("SKIP");

        KeyboardRow optionsRow = new KeyboardRow();
        optionsRow.add("Back");
        optionsRow.add("Cancel");

        return ReplyKeyboardMarkup.builder()
                .keyboardRow(row)
                .keyboardRow(optionsRow)
                .resizeKeyboard(true)
                .oneTimeKeyboard(true)
                .selective(true)
                .build();
    }

    /**
     * Construye un teclado para campos obligatorios (sin boton SKIP).
     * Usar para fechas, horas estimadas y cualquier campo requerido.
     */
    public static ReplyKeyboardMarkup buildRequiredFieldKeyboard() {
        KeyboardRow optionsRow = new KeyboardRow();
        optionsRow.add("Back");
        optionsRow.add("Cancel");

        return ReplyKeyboardMarkup.builder()
                .keyboardRow(optionsRow)
                .resizeKeyboard(true)
                .oneTimeKeyboard(true)
                .selective(true)
                .build();
    }

    /**
     * Construye un teclado con opciones simples para el menu principal
     */
    public static ReplyKeyboardMarkup buildMainMenuKeyboard() {
        KeyboardRow row1 = new KeyboardRow();
        row1.add("View Tasks");
        row1.add("New Task");

        KeyboardRow row2 = new KeyboardRow();
        row2.add("View Sprints");
        row2.add("Help");

        return ReplyKeyboardMarkup.builder()
                .keyboardRow(row1)
                .keyboardRow(row2)
                .resizeKeyboard(true)
                .oneTimeKeyboard(false)
                .selective(true)
                .build();
    }
}
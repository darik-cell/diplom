/**
 * Функция, которая ищет все вхождения ??...??
 * и заменяет их:
 *  - если isClozeView = false => <mark>...</mark>
 *  - если isClozeView = true  => <span class="cloze" data-cloze="Оригинал" data-ordinal="N">[...]</span>
 *
 * Оригинальное содержимое между ?? и ?? сохраняется в массив hiddenContents.
 *
 * @param {string} text - Исходный текст
 * @param {boolean} isClozeView - Флаг режима «глаз»
 * @param {Array} hiddenContents - Массив для хранения оригинальных значений
 * @returns {string} - Обработанный текст
 */
export function processMarkedText(text, isClozeView, hiddenContents = []) {
    const regex = /\?\?(.+?)\?\?/g; // ищем пары ?? ... ?? (не жадно)

    return text.replace(regex, (match, contentInside) => {
        // сохраняем оригинальное содержимое
        hiddenContents.push(contentInside);

        if (isClozeView) {
            // Режим «глаз» (cloze)
            return `[...]`;
        } else {
            // Обычный режим (<mark>)
            return `${contentInside}`;
        }
    });
}

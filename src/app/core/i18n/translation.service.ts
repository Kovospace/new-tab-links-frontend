import { PlatformLocation, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES,
  SupportedLanguageCode,
  isSupportedLanguageCode,
} from './supported-language';
import { splitLanguagePrefix } from './localized-address';
import {
  FlatTranslationDictionary,
  NestedTranslationFile,
  TranslatedValue,
  fillPlaceholders,
  flattenTranslationFile,
} from './translation-dictionary';

/** Key the chosen language is remembered under, so a reload keeps it. */
const STORED_LANGUAGE_KEY = 'newtablinks.language';

/** Where the translation files are served from; they ship in {@code public/i18n}. */
const TRANSLATION_FILE_DIRECTORY = 'i18n';

/**
 * Holds the active language and the strings that go with it.
 *
 * <p>Every piece of user-visible text on this site lives in {@code public/i18n/<code>.json} and
 * is reached through this service, so that a new language is a new file and nothing else.
 * Translations are loaded once at startup and again whenever the language changes.</p>
 *
 * <p>The dictionary is a signal, so a language change re-renders every binding that read it —
 * templates and view-models alike — with no subscription to manage.</p>
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly httpClient = inject(HttpClient);
  private readonly platformLocation = inject(PlatformLocation);
  private readonly isRunningInBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Strings of the active language, empty until the first file has loaded. */
  private readonly activeTranslations = signal<FlatTranslationDictionary>(new Map());

  /** The language currently displayed. */
  private readonly activeLanguageCode = signal<SupportedLanguageCode>(DEFAULT_LANGUAGE_CODE);

  /** The language currently displayed, for anything that has to show or compare it. */
  readonly currentLanguageCode = this.activeLanguageCode.asReadonly();

  /** Every language the user may switch to. */
  readonly availableLanguageCodes = computed<readonly SupportedLanguageCode[]>(
    () => SUPPORTED_LANGUAGE_CODES,
  );

  /**
   * Loads the language the user should start in.
   *
   * <p>Called once during application start-up, before the first page renders, so that no
   * untranslated frame is ever shown. An address with a language prefix ({@code /sk/tips}) decides
   * on its own; otherwise the reader's {@link preferredLanguageCode} does. The router has not run
   * yet at this point, which is why the address is read from the platform.</p>
   *
   * @returns a promise that settles when the strings are in place
   */
  async loadInitialLanguage(): Promise<void> {
    const addressLanguageCode = splitLanguagePrefix(this.platformLocation.pathname).languageCode;
    await this.changeLanguage(addressLanguageCode ?? this.preferredLanguageCode());
  }

  /**
   * Switches to a language unless it is already the one displayed.
   *
   * <p>For the route guard that follows an address's language, which runs on every entry into a
   * public page and should not fetch the same file again each time.</p>
   *
   * @param languageCode the language the address asks for
   * @returns a promise that settles when that language is in place
   */
  async useLanguage(languageCode: SupportedLanguageCode): Promise<void> {
    if (languageCode !== this.activeLanguageCode() || this.activeTranslations().size === 0) {
      await this.changeLanguage(languageCode);
    }
  }

  /**
   * Switches to another language and remembers the choice.
   *
   * <p>A failed load leaves the previous language in place: a page in the wrong language is far
   * better than a page of raw translation keys.</p>
   *
   * @param languageCode the language to display from now on
   * @returns a promise that settles when the new strings are in place
   */
  async changeLanguage(languageCode: SupportedLanguageCode): Promise<void> {
    try {
      const translationFile = await firstValueFrom(
        this.httpClient.get<NestedTranslationFile>(
          `${TRANSLATION_FILE_DIRECTORY}/${languageCode}.json`,
        ),
      );

      this.activeTranslations.set(flattenTranslationFile(translationFile));
      this.activeLanguageCode.set(languageCode);
      this.rememberLanguageChoice(languageCode);
    } catch {
      // Deliberately swallowed: see the method contract above.
    }
  }

  /**
   * Looks a translated string up by its dotted key.
   *
   * <p>An unknown key returns the key itself. That makes a missing translation obvious on the
   * page instead of silently rendering an empty element.</p>
   *
   * <p>A value authored as several paragraphs is joined into one string here, rather than
   * refused. A binding written before a translator split that text into two paragraphs keeps
   * working and keeps reading correctly; use {@link translateToParagraphs} where the paragraphs
   * are supposed to render as separate elements.</p>
   *
   * @param translationKey    dotted path into the translation file, for example {@code nav.home}
   * @param placeholderValues values for any {@code {placeholder}} markers in the string
   * @returns the translated text, or the key when it is not translated
   */
  translate(
    translationKey: string,
    placeholderValues?: Readonly<Record<string, string | number>>,
  ): string {
    return this.translateToParagraphs(translationKey, placeholderValues).join(' ');
  }

  /**
   * Looks a translated value up and returns it as the paragraphs it should render as.
   *
   * <p>A translation file may author a value as an array of strings when the text runs to more
   * than one paragraph — which happens when a language needs more words than another to say the
   * same thing. This is how a template gets at them without knowing which form was used: a plain
   * string comes back as one paragraph, an array as its own entries, and an unknown key as the
   * key itself, so a missing translation is as visible here as it is in {@link translate}.</p>
   *
   * @param translationKey    dotted path into the translation file
   * @param placeholderValues values for any {@code {placeholder}} markers, applied per paragraph
   * @returns one entry per paragraph, never empty
   */
  translateToParagraphs(
    translationKey: string,
    placeholderValues?: Readonly<Record<string, string | number>>,
  ): readonly string[] {
    const translatedValue: TranslatedValue | undefined =
      this.activeTranslations().get(translationKey);

    if (translatedValue === undefined) {
      return [translationKey];
    }

    const paragraphs =
      typeof translatedValue === 'string' ? [translatedValue] : [...translatedValue];

    return paragraphs.map((paragraph) => fillPlaceholders(paragraph, placeholderValues));
  }

  /**
   * The language this reader would choose, for an address that does not name one.
   *
   * <p>In order: what the user chose last time, then what the browser asks for, then English.</p>
   *
   * <p>Always the default language when rendering at build time. Node has a {@code navigator} of
   * its own, so without this the build machine's locale could decide what language a page was
   * published in.</p>
   *
   * @returns the language to show
   */
  preferredLanguageCode(): SupportedLanguageCode {
    if (!this.isRunningInBrowser) {
      return DEFAULT_LANGUAGE_CODE;
    }
    const previouslyChosenLanguage = this.readRememberedLanguageChoice();
    if (isSupportedLanguageCode(previouslyChosenLanguage)) {
      return previouslyChosenLanguage;
    }

    const browserPreferredLanguage = globalThis.navigator?.language?.split('-')[0];
    return isSupportedLanguageCode(browserPreferredLanguage)
      ? browserPreferredLanguage
      : DEFAULT_LANGUAGE_CODE;
  }

  /**
   * Reads the remembered language choice.
   *
   * @returns the stored code, or null when there is none or storage is unavailable
   */
  private readRememberedLanguageChoice(): string | null {
    try {
      return globalThis.localStorage?.getItem(STORED_LANGUAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Remembers the language choice for the next visit.
   *
   * <p>Storage can be unavailable — a private window, or site data blocked — and that must not
   * break the page, so a failure is ignored.</p>
   *
   * @param languageCode the language the user chose
   */
  private rememberLanguageChoice(languageCode: SupportedLanguageCode): void {
    try {
      globalThis.localStorage?.setItem(STORED_LANGUAGE_KEY, languageCode);
    } catch {
      // Ignored: remembering the choice is a convenience, not a requirement.
    }
  }
}

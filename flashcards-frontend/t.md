public interface MaskStrategy {
    String mask(String data);
}
public abstract class AbstractTagStrategy implements MaskStrategy {

    protected static final String OPENING_TAG = "<k2>";
    protected static final String CLOSING_TAG = "</k2>";

    abstract Pattern getPattern();

    @Override
    public String mask(String data) {
        return StringReplacer.replace(data, getPattern(), this::markDataUsingSpecialTags);
    }

    protected String markDataUsingSpecialTags(String source, int start, int end) {
        if (source.substring(start, end).equalsIgnoreCase("null")) {
            return source;
        }
        return new StringBuffer(source)
                .insert(start, OPENING_TAG)
                .insert(end + OPENING_TAG.length(), CLOSING_TAG).toString();
    }
}

public class StringReplacer {

    public static String replace(String data, Pattern pattern, StringReplaceFunction replaceFunction) {
        Matcher matcher = pattern.matcher(data);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            IntStream.rangeClosed(1, matcher.groupCount()).forEach(group -> {
                if (matcher.group(group) != null) {
                    int start = matcher.start(group) - matcher.start();
                    int end = matcher.end(group) - matcher.start();
                    if (end > start) {
                        val replacement = replaceFunction.replace(matcher.group(), start, end);
                        matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
                    }
                }
            });
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}

public class ContractNumberMaskStrategy extends AbstractTagStrategy {

    private static final Stream<String> contractNumberRegexStream = Stream.of(
            "[Д|д]оговор с номером:? (\\w+)",
            "[Д|д]оговор[А-я]+ с номером:? (\\w+)",
            "\"addedContractNumber\":\\s?\"(\\w+)\\\"",
            "\"?contractNumber\"?:\\s?\\\\?\"(\\w+)\\\\?\\\"",
            "contractNumber=(\\w+)",
            "activeIiaContractNumber=(\\w+)",
            "client code: (\\w+)",
            "byNumber=\\{.*number=(\\w+)",
            "byNumber\\(number: (\\w+)\\)",
            "byNumber\\((\\w+)\\: String!\\)",
            "ContractCache\\[.*number=(\\w+)",
            "tradingCode='?(\\w+)'?",
            "login\\\":\\s?\\\"(\\w+)\\\"",
            "login=(\\w+)",
            "lastName\\\\\\\":\\\\\\\"(\\w+)\\\\",
            "\"lastName\":\\s?\"(\\w+)\"",
            "updatedContractData\":\\{.*?\"number\":\\s?\"(\\w+)\""
    );

    private static final Pattern contractNumberPattern = Pattern.compile(contractNumberRegexStream.collect(Collectors.joining("|")), Pattern.MULTILINE);

    @Override
    Pattern getPattern() {
        return contractNumberPattern;
    }
}

public class PersonalDataMaskerUtils {

    private final List<MaskStrategy> maskStrategies = List.of(
            new ContractNumberMaskStrategy(),
            new ContractNumberItemInArrayStrategy(),
            new PasswordMaskStrategy(),
            new PhoneMaskStrategy(),
            new EmailMaskStrategy(),
            new ExternalAttributesMaskStrategy(),
            new VerifiedPhoneMaskStrategy(),
            new PersonalNameMaskStrategy()
    );

    public static String maskSensitiveData(String message) {
        for (var strategy : maskStrategies) {
            message = strategy.mask(message);
        }
        return message;
    }

}

public class MaskingPatternLayout extends PatternLayout {

    @Override
    public String doLayout(ILoggingEvent event) {
        return maskSensitiveData(super.doLayout(event));
    }
}

Перенеси этот код на холст

&&&
- Проект на spring boot
- intellij idea
- gradle
- для логирования logback
- логи с кириллицей выводятся как абра-кадабра, как я могу это исправить?
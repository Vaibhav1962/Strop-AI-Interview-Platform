"""The delivery radar is scored from the transcript, not from the model's default "Strong".

Regression: a candidate who said "simply" 12 times and "basically" 4 times still got full marks on Filler Control,
because the filler list was six words long and did not include "simply".
"""

from app.orchestrator.delivery_scoring import (
    cap_level,
    count_tics,
    filler_level,
    pace_level,
    tic_stats,
)

NEUTRAL = "We store the counts in a hash map keyed by the character and then scan the string once from left to right. "


def _answer(simply=0, basically=0, extra_words=500):
    sentences = [NEUTRAL * 1 for _ in range(extra_words // 22)]
    sentences += ["so we would simply return zero here."] * simply
    sentences += ["and basically swap the two values."] * basically
    return " ".join(sentences)


def test_the_reported_case_no_longer_scores_full_marks():
    text = _answer(simply=12, basically=4, extra_words=440)
    weighted, breakdown, words, rate = tic_stats([text])
    assert breakdown["simply"] == 12 and breakdown["basically"] == 4
    assert weighted == 16
    assert rate is not None and 2.0 <= rate <= 4.0
    assert filler_level(rate) == 1


def test_a_clean_answer_still_earns_the_top_level():
    _, _, _, rate = tic_stats([_answer()])
    assert rate == 0.0
    assert filler_level(rate) == 4


def test_levels_get_stricter_as_the_rate_rises():
    assert [filler_level(r) for r in (0.0, 0.39, 0.4, 0.99, 1.0, 1.99, 2.0, 9.0)] == [4, 4, 3, 3, 2, 2, 1, 1]


def test_soft_hedges_count_half_and_hard_tics_count_fully():
    assert count_tics("I think maybe it works")[0] == 1.0
    assert count_tics("basically you know it works")[0] == 2.0


def test_like_is_a_filler_only_as_a_filler():
    assert count_tics("it was, like, really slow")[0] == 1.0
    assert count_tics("I would like to use a heap")[0] == 0.0
    assert count_tics("things like a hash map")[0] == 0.0


def test_too_little_speech_gives_no_rate_instead_of_a_guess():
    assert tic_stats(["basically simply you know"])[3] is None


def test_heavy_tics_lower_the_axes_they_make_unreliable():
    rate = 2.7
    assert cap_level(3, "verbal_fluency", rate) == 1
    assert cap_level(3, "confidence", rate) == 2
    assert cap_level(3, "conciseness", rate) == 2
    assert cap_level(3, "clarity", rate) == 3  # only very heavy use (3+ per 100) touches clarity
    assert cap_level(3, "clarity", 3.4) == 2
    assert cap_level(3, "responsiveness", 9.0) == 3  # tics say nothing about listening


def test_a_cap_never_raises_a_level_and_ignores_unknown_rates():
    assert cap_level(1, "verbal_fluency", 0.0) == 1
    assert cap_level(2, "confidence", None) == 2


def test_pace_is_stricter_and_ignores_unbelievable_estimates():
    assert [pace_level(w) for w in (130, 160, 115, 175, 100, 190, 80, 220)] == [4, 4, 3, 3, 2, 2, 1, 1]
    assert pace_level(1255) is None  # an estimate from a few seconds of audio
    assert pace_level(12) is None

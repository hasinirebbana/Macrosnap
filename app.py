import streamlit as st
from google import genai
from google.genai import types

from prompts import (
    SYSTEM_PROMPT,
    WELCOME_MESSAGE_TEMPLATE,
    SUMMARY_REQUEST_PROMPT,
)

GEMINI_API_KEY = st.secrets["GEMINI_API_KEY"]

MODEL_NAME = "gemini-3.8-flash"


@st.cache_resource
def get_gemini_client():
    return genai.Client(api_key=GEMINI_API_KEY)


gemini_client = get_gemini_client()
if "onboarded" not in st.session_state:

    st.title("MacroSnap")
    st.caption("Snap it. Track it. Text yourself the results.")

    with st.form("onboarding_form"):

        name = st.text_input("Your name")

        whatsapp_number = st.text_input(
            "WhatsApp number (with country code)",
            placeholder="+91XXXXXXXXXX",
        )

        submitted = st.form_submit_button("Let's go 🚀")

    if submitted:

        if not name.strip() or not whatsapp_number.strip():

            st.warning(
                "Please fill in both your name and WhatsApp number."
            )

        else:

            st.session_state.name = name.strip()
            st.session_state.whatsapp_number = whatsapp_number.strip()

            st.session_state.chat = gemini_client.chats.create(
                model=MODEL_NAME,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT
                ),
            )

            st.session_state.messages = []
            st.session_state.onboarded = True

            st.rerun()

    st.stop()
def render_message(message):

    with st.chat_message(message["role"]):

        if message["kind"] == "text":

            st.write(message["content"])

        elif message["kind"] == "image":

            st.image(message["content"])


def add_message(role, kind, content):

    st.session_state.messages.append(
        {
            "role": role,
            "kind": kind,
            "content": content,
        }
    )

    render_message(st.session_state.messages[-1])

if not st.session_state.messages:

    add_message(
        "assistant",
        "text",
        WELCOME_MESSAGE_TEMPLATE.format(
            name=st.session_state.name
        ),
    )

else:

    for message in st.session_state.messages:

        render_message(message)

def ask_gemini(parts):

    try:

        response = st.session_state.chat.send_message(parts)

        return response.text

    except Exception as error:

        return f"Sorry, something went wrong: {error}"

user_input = st.chat_input(
    "Ask a question, or attach a photo of your meal",
    accept_file=True,
    file_type=["jpg", "jpeg", "png"],
)


if user_input:

    photo = user_input.files[0] if user_input.files else None

    text = user_input.text

    parts = []
    if photo is not None:

        photo_bytes = photo.getvalue()

        add_message(
            "user",
            "image",
            photo_bytes,
        )

        parts.append(
            types.Part.from_bytes(
                data=photo_bytes,
                mime_type=photo.type,
            )
        )


    if text:

        add_message(
            "user",
            "text",
            text,
        )

        parts.append(text)

    elif photo is not None:

        parts.append(
            "What is this meal? Give me the calories and macros."
        )
    with st.spinner("Crunching the numbers..."):

        answer = ask_gemini(parts)


    add_message(
        "assistant",
        "text",
        answer,
    )